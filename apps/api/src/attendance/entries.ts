import { and, count, desc, eq, isNull } from "drizzle-orm";
import db from "../database";
import { attendanceEntryTable } from "../database/schema";
import { attendanceAccess, subjectAccess } from "./access";
import { needsTimerReview } from "./time";

export async function getAttendanceTimer(userId: string) {
  const [row] = await db
    .select()
    .from(attendanceEntryTable)
    .where(
      and(
        eq(attendanceEntryTable.userId, userId),
        isNull(attendanceEntryTable.endTime),
        isNull(attendanceEntryTable.deletedAt),
      ),
    )
    .limit(1);
  return row
    ? {
        id: row.id,
        projectName: row.projectName,
        startTime: row.startTime,
        needsReview: needsTimerReview(row),
      }
    : null;
}

export async function getAttendanceEntries(
  actorId: string,
  userId: string,
  offset: number,
  limit: number,
) {
  await subjectAccess(actorId, userId);
  const condition = and(
    eq(attendanceEntryTable.userId, userId),
    isNull(attendanceEntryTable.deletedAt),
  );
  const rows = await db
    .select()
    .from(attendanceEntryTable)
    .where(condition)
    .orderBy(desc(attendanceEntryTable.startTime))
    .offset(offset)
    .limit(limit);
  const [total] = await db
    .select({ value: count() })
    .from(attendanceEntryTable)
    .where(condition);
  const [running] = await db
    .select()
    .from(attendanceEntryTable)
    .where(and(condition, isNull(attendanceEntryTable.endTime)))
    .limit(1);
  const money =
    actorId === userId ||
    (await attendanceAccess(actorId)).permissions.includes("finance");
  const serialize = (row: typeof attendanceEntryTable.$inferSelect) => ({
    ...row,
    hourlyRate: money ? row.hourlyRate : null,
    needsReview: needsTimerReview(row),
  });
  return {
    entries: rows.map(serialize),
    running: running ? serialize(running) : null,
    total: total?.value ?? 0,
  };
}
