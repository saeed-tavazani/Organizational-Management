import type { DbOrTx } from "../project-access/db-or-tx";
import { attendanceAuditTable } from "../database/schema";
export async function attendanceAudit(
  database: DbOrTx,
  userId: string,
  actorId: string,
  action: string,
  resourceId: string,
  before: unknown = null,
  after: unknown = null,
) {
  await database
    .insert(attendanceAuditTable)
    .values({ userId, actorId, action, resourceId, before, after });
}
