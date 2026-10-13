import { and, count, desc, eq, sql } from "drizzle-orm";
import db from "../../database";
import { attendanceRequestTable, userTable } from "../../database/schema";
import { attendanceAccess } from "../access";

export async function listAttendanceRequests(
  actorId: string,
  userId: string | undefined,
  offset: number,
  limit: number,
) {
  const access = await attendanceAccess(actorId);
  const allowedKinds = [
    ...(access.permissions.includes("leave") ? ["leave", "cancel"] : []),
    ...(access.permissions.includes("corrections")
      ? ["correction", "review"]
      : []),
    ...(access.permissions.includes("rates") ? ["rate"] : []),
  ];
  const visible = sql`(${attendanceRequestTable.userId} = ${actorId} OR ${attendanceRequestTable.payload}->>'kind' IN (${
    allowedKinds.length
      ? sql.join(
          allowedKinds.map((k) => sql`${k}`),
          sql`,`,
        )
      : sql`NULL`
  }))`;
  const condition = and(
    visible,
    userId ? eq(attendanceRequestTable.userId, userId) : undefined,
  );
  const rows = await db
    .select({ request: attendanceRequestTable, userName: userTable.name })
    .from(attendanceRequestTable)
    .innerJoin(userTable, eq(userTable.id, attendanceRequestTable.userId))
    .where(condition)
    .orderBy(desc(attendanceRequestTable.createdAt))
    .offset(offset)
    .limit(limit);
  const [total] = await db
    .select({ value: count() })
    .from(attendanceRequestTable)
    .where(condition);
  return {
    requests: rows.map(({ request, userName }) => ({ ...request, userName })),
    total: total?.value ?? 0,
  };
}
