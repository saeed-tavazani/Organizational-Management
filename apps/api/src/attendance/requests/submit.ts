import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  attendanceEntryTable,
  attendanceRequestTable,
  userTable,
} from "../../database/schema";
import {
  attendanceSettings,
  requireAttendance,
  requireEmployee,
} from "../access";
import { attendanceAudit } from "../audit";
import { attendanceChanged } from "../events";
import { lockAttendance } from "../lock";
import { attendanceProject } from "../projects";
import { localInstant, localParts, needsTimerReview } from "../time";
import type { AttendanceRequestPayload } from "../types";
import { requestPermission } from "./permission";

export async function submitAttendanceRequest(
  actorId: string,
  userId: string,
  payload: AttendanceRequestPayload,
  reason: string,
) {
  if (actorId !== userId)
    await requireAttendance(actorId, requestPermission(payload));
  const request = await db.transaction(async (tx) => {
    await lockAttendance(tx, userId);
    if (
      payload.kind === "leave" ||
      payload.kind === "rate" ||
      (payload.kind === "correction" && !payload.entryId)
    )
      await requireEmployee(userId, tx);
    const normalized = { ...payload };
    if (
      (normalized.kind === "correction" || normalized.kind === "review") &&
      normalized.entryId
    ) {
      const [pending] = await tx
        .select({ id: attendanceRequestTable.id })
        .from(attendanceRequestTable)
        .where(
          and(
            eq(attendanceRequestTable.userId, userId),
            eq(attendanceRequestTable.status, "pending"),
            sql`${attendanceRequestTable.payload}->>'entryId' = ${normalized.entryId}`,
          ),
        )
        .limit(1);
      if (pending)
        throw new HTTPException(409, {
          message: "An entry request is already pending",
        });
    }
    if (normalized.kind === "leave" || normalized.kind === "correction") {
      if (normalized.kind === "leave" && normalized.mode === "daily") {
        const { policy } = await attendanceSettings(tx);
        normalized.startTime = localInstant(
          localParts(new Date(normalized.startTime), policy.timeZone).day,
          "00:00",
          policy.timeZone,
        ).toISOString();
        normalized.endTime = localInstant(
          localParts(new Date(normalized.endTime), policy.timeZone).day,
          "00:00",
          policy.timeZone,
        ).toISOString();
      }
      if (
        Date.parse(normalized.endTime) <= Date.parse(normalized.startTime) ||
        Date.parse(normalized.endTime) - Date.parse(normalized.startTime) >
          367 * 86400000
      )
        throw new HTTPException(400, { message: "Invalid interval" });
      if (normalized.kind === "correction") {
        if (Date.parse(normalized.endTime) > Date.now())
          throw new HTTPException(400, {
            message: "Work cannot be registered in the future",
          });
        if (normalized.entryId) {
          const [entry] = await tx
            .select()
            .from(attendanceEntryTable)
            .where(
              and(
                eq(attendanceEntryTable.id, normalized.entryId),
                eq(attendanceEntryTable.userId, userId),
              ),
            );
          if (!entry || entry.deletedAt || !entry.endTime)
            throw new HTTPException(409, {
              message: "Stop the timer before requesting a correction",
            });
        } else {
          if (normalized.remove)
            throw new HTTPException(400, {
              message: "An entry is required for removal",
            });
          await attendanceProject(userId, normalized.projectId, tx);
        }
      }
    }
    if (normalized.kind === "cancel") {
      const [leave] = await tx
        .select()
        .from(attendanceRequestTable)
        .where(
          and(
            eq(attendanceRequestTable.id, normalized.requestId),
            eq(attendanceRequestTable.userId, userId),
            eq(attendanceRequestTable.status, "approved"),
          ),
        );
      if (leave?.payload.kind !== "leave")
        throw new HTTPException(404, { message: "Approved leave not found" });
    }
    if (normalized.kind === "review") {
      const [entry] = await tx
        .select()
        .from(attendanceEntryTable)
        .where(
          and(
            eq(attendanceEntryTable.id, normalized.entryId),
            eq(attendanceEntryTable.userId, userId),
          ),
        );
      if (
        !entry ||
        entry.deletedAt ||
        !entry.endTime ||
        !needsTimerReview(entry)
      )
        throw new HTTPException(409, {
          message: "No stopped timer awaiting review",
        });
    }
    const [row] = await tx
      .insert(attendanceRequestTable)
      .values({ userId, payload: normalized, reason })
      .returning();
    if (!row)
      throw new HTTPException(500, { message: "Could not create request" });
    await attendanceAudit(
      tx,
      userId,
      actorId,
      "request.submitted",
      row.id,
      null,
      row,
    );
    return row;
  });
  await attendanceChanged(userId, request.id, requestPermission(payload), true);
  const [user] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId));
  return { ...request, userName: user?.name ?? "" };
}
