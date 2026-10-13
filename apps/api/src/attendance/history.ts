import { count, desc, eq } from "drizzle-orm";
import db from "../database";
import { attendanceAuditTable, userTable } from "../database/schema";
import { subjectAccess } from "./access";
export async function attendanceHistory(
  actorId: string,
  userId: string,
  offset: number,
  limit: number,
) {
  await subjectAccess(actorId, userId);
  const rows = await db
    .select({ audit: attendanceAuditTable, actorName: userTable.name })
    .from(attendanceAuditTable)
    .leftJoin(userTable, eq(userTable.id, attendanceAuditTable.actorId))
    .where(eq(attendanceAuditTable.userId, userId))
    .orderBy(desc(attendanceAuditTable.createdAt))
    .offset(offset)
    .limit(limit);
  const [total] = await db
    .select({ value: count() })
    .from(attendanceAuditTable)
    .where(eq(attendanceAuditTable.userId, userId));
  const time = (value: unknown, key: string) =>
    value &&
    typeof value === "object" &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string"
      ? (value as Record<string, string>)[key]!
      : null;
  return {
    items: rows.map(({ audit, actorName }) => ({
      id: audit.id,
      action: audit.action,
      actorName: actorName ?? "",
      resourceId: audit.resourceId,
      createdAt: audit.createdAt,
      startBefore: time(audit.before, "startTime"),
      endBefore: time(audit.before, "endTime"),
      startAfter: time(audit.after, "startTime"),
      endAfter: time(audit.after, "endTime"),
    })),
    total: total?.value ?? 0,
  };
}
