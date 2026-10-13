import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { attendanceEntryTable } from "../database/schema";
import { attendanceSettings, currentRate, requireEmployee } from "./access";
import { attendanceProject } from "./projects";
import { lockAttendance } from "./lock";
import { attendanceAudit } from "./audit";
import { attendanceChanged } from "./events";
import { approvedLeaves, assertNoWorkOverlap } from "./overlap";
import { needsTimerReview } from "./time";

export async function startTimer(
  userId: string,
  projectId: string,
  description: string,
) {
  const entry = await db.transaction(async (tx) => {
    await lockAttendance(tx, userId);
    await requireEmployee(userId, tx);
    const project = await attendanceProject(userId, projectId, tx);
    const now = new Date();
    await assertNoWorkOverlap(tx, userId, now, null);
    if (
      (await approvedLeaves(tx, userId)).some(
        (l) => +l.startTime <= +now && +l.endTime > +now,
      )
    )
      throw new HTTPException(409, { message: "Approved leave is active" });
    const { policy } = await attendanceSettings(tx, now);
    const [row] = await tx
      .insert(attendanceEntryTable)
      .values({
        userId,
        ...project,
        description,
        startTime: now,
        hourlyRate: await currentRate(userId, tx, now),
        policy,
      })
      .returning();
    if (!row)
      throw new HTTPException(500, { message: "Could not start timer" });
    await attendanceAudit(
      tx,
      userId,
      userId,
      "timer.started",
      row.id,
      null,
      row,
    );
    return row;
  });
  await attendanceChanged(userId, entry.id);
  return { ...entry, needsReview: false };
}

export async function stopTimer(userId: string, id: string) {
  const entry = await db.transaction(async (tx) => {
    await lockAttendance(tx, userId);
    const [row] = await tx
      .select()
      .from(attendanceEntryTable)
      .where(
        and(
          eq(attendanceEntryTable.id, id),
          eq(attendanceEntryTable.userId, userId),
          isNull(attendanceEntryTable.deletedAt),
        ),
      );
    if (!row) throw new HTTPException(404, { message: "Timer not found" });
    if (row.endTime) return row;
    const endTime = new Date();
    const leaves = await approvedLeaves(tx, userId);
    const pending =
      needsTimerReview(row, endTime) ||
      leaves.some(
        (l) => +l.startTime < +endTime && +l.endTime > +row.startTime,
      );
    const [updated] = await tx
      .update(attendanceEntryTable)
      .set({ endTime, reviewStatus: pending ? "pending" : "valid" })
      .where(eq(attendanceEntryTable.id, id))
      .returning();
    if (!updated)
      throw new HTTPException(500, { message: "Could not stop timer" });
    await attendanceAudit(
      tx,
      userId,
      userId,
      "timer.stopped",
      id,
      row,
      updated,
    );
    return updated;
  });
  await attendanceChanged(userId, id);
  return { ...entry, needsReview: needsTimerReview(entry) };
}
