import {
  defaultAttendanceGrants,
  type AttendancePermission,
} from "@kaneo/permissions";
import { and, desc, eq, lte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  attendanceEmployeeTable,
  attendanceRateTable,
  attendanceSettingsTable,
  userTable,
  workspaceUserTable,
} from "../database/schema";
import { hasInstanceAdminRole } from "../utils/instance-admin-role";
import type { DbOrTx } from "../project-access/db-or-tx";
import { defaultAttendancePolicy } from "./time";

export async function attendanceSettings(database: DbOrTx = db, at?: Date) {
  const [row] = await database
    .select()
    .from(attendanceSettingsTable)
    .where(at ? lte(attendanceSettingsTable.effectiveAt, at) : undefined)
    .orderBy(
      desc(attendanceSettingsTable.effectiveAt),
      desc(attendanceSettingsTable.createdAt),
    )
    .limit(1);
  return {
    policy: row?.policy ?? defaultAttendancePolicy,
    grants: row?.grants ?? defaultAttendanceGrants,
    configured: Boolean(row),
  };
}

export async function attendanceAccess(userId: string, database: DbOrTx = db) {
  const [user] = await database
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId));
  const [employee] = await database
    .select()
    .from(attendanceEmployeeTable)
    .where(eq(attendanceEmployeeTable.userId, userId));
  const role = hasInstanceAdminRole(user?.role)
    ? ("admin" as const)
    : (employee?.role ?? "employee");
  const { grants } = await attendanceSettings(database);
  return {
    role,
    permissions:
      role === "admin"
        ? ([
            "reports",
            "finance",
            "bank",
            "leave",
            "corrections",
            "rates",
            "settings",
            "roles",
          ] as AttendancePermission[])
        : grants[role],
  };
}

export async function requireAttendance(
  userId: string,
  permission: AttendancePermission,
  database: DbOrTx = db,
) {
  const access = await attendanceAccess(userId, database);
  if (!access.permissions.includes(permission))
    throw new HTTPException(403, { message: "Attendance permission required" });
  return access;
}

export async function requireEmployee(userId: string, database: DbOrTx = db) {
  const [member] = await database
    .select({ id: workspaceUserTable.id })
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userId, userId))
    .limit(1);
  const access = await attendanceAccess(userId, database);
  if (!member && access.role === "employee")
    throw new HTTPException(403, { message: "Workspace membership required" });
}

export async function subjectAccess(
  actorId: string,
  subjectId: string,
  permission: AttendancePermission = "reports",
  database: DbOrTx = db,
) {
  if (actorId !== subjectId)
    await requireAttendance(actorId, permission, database);
}

export async function currentRate(
  userId: string,
  database: DbOrTx = db,
  at = new Date(),
) {
  const [rate] = await database
    .select({ amount: attendanceRateTable.amount })
    .from(attendanceRateTable)
    .where(
      and(
        eq(attendanceRateTable.userId, userId),
        lte(attendanceRateTable.effectiveAt, at),
      ),
    )
    .orderBy(desc(attendanceRateTable.effectiveAt))
    .limit(1);
  return rate?.amount ?? null;
}
