import { sql } from "drizzle-orm";
import db from "../database";
import type { AttendancePolicy } from "./types";
export async function reportArrivals(
  from: string,
  to: string,
  userId?: string,
) {
  const result = await db.execute<{
    userId: string;
    arrival: string;
    policy: AttendancePolicy;
  }>(sql`
    WITH daily AS (
      SELECT e.user_id AS "userId", greatest(e.start_time, d) AS arrival, e.policy,
        row_number() OVER (PARTITION BY e.user_id, local_day::date ORDER BY greatest(e.start_time, d), e.created_at) AS rank
      FROM attendance_entry e
      CROSS JOIN LATERAL generate_series(
        greatest(date_trunc('day', e.start_time AT TIME ZONE (e.policy->>'timeZone')), date_trunc('day', ${from}::timestamptz AT TIME ZONE (e.policy->>'timeZone'))),
        least(date_trunc('day', (coalesce(e.end_time, now()) - interval '1 microsecond') AT TIME ZONE (e.policy->>'timeZone')), date_trunc('day', ${to}::timestamptz AT TIME ZONE (e.policy->>'timeZone'))), interval '1 day'
      ) days(local_day)
      CROSS JOIN LATERAL (SELECT local_day AT TIME ZONE (e.policy->>'timeZone') AS d) instant
      WHERE e.deleted_at IS NULL
        AND e.start_time < ${to}::timestamptz AND coalesce(e.end_time,now()) > ${from}::timestamptz
        ${userId ? sql`AND e.user_id = ${userId}` : sql``}
        AND d < ${to}::timestamptz
    ) SELECT "userId", arrival::text, policy FROM daily WHERE rank = 1
  `);
  return result.rows;
}
