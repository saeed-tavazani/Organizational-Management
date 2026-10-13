import { and, count, eq, exists, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  attendanceBankTable,
  attendanceEmployeeTable,
  attendanceSettingsTable,
  userTable,
  workspaceUserTable,
} from "../database/schema";
import { hasInstanceAdminRole } from "../utils/instance-admin-role";
import {
  attendanceAccess,
  attendanceSettings,
  currentRate,
  requireAttendance,
} from "./access";
import { attendanceAudit } from "./audit";
import { attendanceChanged } from "./events";
import { lockAttendance } from "./lock";
import { localInstant, localParts, nextDay } from "./time";
import type { AttendanceGrants, AttendanceRole } from "@kaneo/permissions";
import type { AttendancePolicy } from "./types";
import type { z } from "../openapi";
import type { bankSchema } from "./schema";

export async function attendanceProfile(actorId: string, userId: string) {
  const actorAccess = await attendanceAccess(actorId);
  if (
    actorId !== userId &&
    !actorAccess.permissions.some((p) =>
      [
        "reports",
        "finance",
        "bank",
        "rates",
        "roles",
        "leave",
        "corrections",
      ].includes(p),
    )
  )
    throw new HTTPException(403, { message: "Employee access required" });
  const access = await attendanceAccess(userId);
  const actor = await attendanceAccess(actorId);
  const [bank] =
    actorId === userId || actor.permissions.includes("bank")
      ? await db
          .select()
          .from(attendanceBankTable)
          .where(eq(attendanceBankTable.userId, userId))
      : [];
  return {
    userId,
    ...access,
    rate:
      actorId === userId || actor.permissions.includes("finance")
        ? await currentRate(userId)
        : null,
    bank: bank ?? null,
  };
}

export async function saveAttendanceBank(
  userId: string,
  bank: z.infer<typeof bankSchema>,
) {
  await db.transaction(async (tx) => {
    await lockAttendance(tx, userId);
    await tx
      .insert(attendanceBankTable)
      .values({ userId, ...bank })
      .onConflictDoUpdate({
        target: attendanceBankTable.userId,
        set: { ...bank, updatedAt: new Date() },
      });
    // Audit the action, never duplicate bank identifiers in audit/event payloads.
    await attendanceAudit(tx, userId, userId, "bank.updated", userId);
  });
  await attendanceChanged(userId, userId, "bank");
  return bank;
}

export async function attendanceEmployees(
  actorId: string,
  offset: number,
  limit: number,
) {
  const access = await attendanceAccess(actorId);
  if (
    !access.permissions.some((p) =>
      [
        "reports",
        "finance",
        "bank",
        "rates",
        "roles",
        "leave",
        "corrections",
      ].includes(p),
    )
  )
    throw new HTTPException(403, { message: "Employee access required" });
  const eligible = or(
    exists(
      db
        .select({ id: workspaceUserTable.id })
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.userId, userTable.id)),
    ),
    exists(
      db
        .select({ id: attendanceEmployeeTable.userId })
        .from(attendanceEmployeeTable)
        .where(eq(attendanceEmployeeTable.userId, userTable.id)),
    ),
    sql`'admin' = ANY(string_to_array(${userTable.role}, ','))`,
  );
  const rows = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      email: userTable.email,
      instanceRole: userTable.role,
      role: attendanceEmployeeTable.role,
    })
    .from(userTable)
    .leftJoin(
      attendanceEmployeeTable,
      eq(attendanceEmployeeTable.userId, userTable.id),
    )
    .where(eligible)
    .orderBy(userTable.name, userTable.id)
    .offset(offset)
    .limit(limit);
  const [total] = await db
    .select({ value: count() })
    .from(userTable)
    .where(eligible);
  const users = await Promise.all(
    rows.map(async (r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: hasInstanceAdminRole(r.instanceRole)
        ? ("admin" as const)
        : (r.role ?? "employee"),
      rate: access.permissions.includes("finance")
        ? await currentRate(r.userId)
        : null,
    })),
  );
  return { users, total: total?.value ?? 0 };
}

export async function saveAttendanceRole(
  actorId: string,
  userId: string,
  role: AttendanceRole,
) {
  await requireAttendance(actorId, "roles");
  if ((await attendanceAccess(actorId)).role !== "admin")
    throw new HTTPException(403, {
      message: "Only instance administrators assign roles",
    });
  await db.transaction(async (tx) => {
    await lockAttendance(tx, userId);
    const [user] = await tx
      .select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, userId));
    if (!user) throw new HTTPException(404, { message: "User not found" });
    if (hasInstanceAdminRole(user.role))
      throw new HTTPException(400, {
        message: "Instance administrator role is inherited",
      });
    const [before] = await tx
      .select()
      .from(attendanceEmployeeTable)
      .where(eq(attendanceEmployeeTable.userId, userId));
    await tx
      .insert(attendanceEmployeeTable)
      .values({ userId, role })
      .onConflictDoUpdate({
        target: attendanceEmployeeTable.userId,
        set: { role },
      });
    await attendanceAudit(
      tx,
      userId,
      actorId,
      "role.updated",
      userId,
      before?.role ?? "employee",
      role,
    );
  });
  await attendanceChanged(userId, userId, "roles");
  return { userId, role };
}

export async function saveAttendanceSettings(
  actorId: string,
  values: { policy: AttendancePolicy; grants: AttendanceGrants },
) {
  if ((await attendanceAccess(actorId)).role !== "admin")
    throw new HTTPException(403, {
      message: "Only instance administrators change company settings",
    });
  await db.transaction(async (tx) => {
    await lockAttendance(tx, "company-settings");
    const previous = await attendanceSettings(tx);
    const now = new Date();
    const effectiveAt = previous.configured
      ? localInstant(
          nextDay(localParts(now, previous.policy.timeZone).day),
          "00:00",
          previous.policy.timeZone,
        )
      : now;
    // Replace a scheduled revision when edited again before its effective date.
    await tx
      .delete(attendanceSettingsTable)
      .where(and(sql`${attendanceSettingsTable.effectiveAt} > now()`));
    const [row] = await tx
      .insert(attendanceSettingsTable)
      .values({ ...values, changedBy: actorId, effectiveAt })
      .returning();
    await attendanceAudit(
      tx,
      actorId,
      actorId,
      "settings.updated",
      row!.id,
      previous,
      values,
    );
  });
  await attendanceChanged(actorId, "company-settings");
  return attendanceSettings();
}
