import { sql } from "drizzle-orm";
import type { DbOrTx } from "../project-access/db-or-tx";
export async function lockAttendance(database: DbOrTx, userId: string) {
  await database.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`attendance:${userId}`}, 0))`,
  );
}
