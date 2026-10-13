import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  attendanceEntryTable,
  attendanceRequestTable,
} from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

export async function assertNoWorkOverlap(
  database: DbOrTx,
  userId: string,
  start: Date,
  end: Date | null,
  exceptId?: string,
) {
  const [overlap] = await database
    .select({ id: attendanceEntryTable.id })
    .from(attendanceEntryTable)
    .where(
      and(
        eq(attendanceEntryTable.userId, userId),
        isNull(attendanceEntryTable.deletedAt),
        exceptId ? ne(attendanceEntryTable.id, exceptId) : undefined,
        sql`tstzrange(${attendanceEntryTable.startTime}, ${attendanceEntryTable.endTime}, '[)') && tstzrange(${start.toISOString()}::timestamptz, ${end?.toISOString() ?? null}::timestamptz, '[)')`,
      ),
    )
    .limit(1);
  if (overlap)
    throw new HTTPException(409, { message: "Work intervals overlap" });
}

export async function approvedLeaves(database: DbOrTx, userId: string) {
  const rows = await database
    .select()
    .from(attendanceRequestTable)
    .where(
      and(
        eq(attendanceRequestTable.userId, userId),
        eq(attendanceRequestTable.status, "approved"),
        sql`${attendanceRequestTable.payload}->>'kind' = 'leave'`,
      ),
    );
  return rows.flatMap((r) =>
    r.payload.kind === "leave"
      ? [
          {
            id: r.id,
            mode: r.payload.mode,
            startTime: new Date(r.payload.startTime),
            endTime: new Date(r.payload.endTime),
          },
        ]
      : [],
  );
}

export async function assertNoLeaveOverlap(
  database: DbOrTx,
  userId: string,
  start: Date,
  end: Date,
) {
  if (
    (await approvedLeaves(database, userId)).some(
      (r) => +r.startTime < +end && +r.endTime > +start,
    )
  )
    throw new HTTPException(409, {
      message: "Approved leave overlaps this interval",
    });
}
