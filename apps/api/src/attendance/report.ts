import { and, eq, isNull, sql } from "drizzle-orm";
import db from "../database";
import {
  attendanceEntryTable as entry,
  attendanceRequestTable,
  userTable,
} from "../database/schema";
import { attendanceAccess, attendanceSettings, subjectAccess } from "./access";
import { reportArrivals } from "./report-arrivals";
import { lateMinutes, localInstant, localParts, nextDay } from "./time";

type ReportInput = {
  scope?: "me" | "all";
  from: string;
  to: string;
  userId?: string;
  projectId?: string;
  workspaceId?: string;
};

export async function attendanceReport(actorId: string, input: ReportInput) {
  const access = await attendanceAccess(actorId);
  const subject =
    input.userId ??
    (input.scope === "all" && access.permissions.includes("reports")
      ? undefined
      : actorId);
  if (subject) await subjectAccess(actorId, subject);
  const from = new Date(input.from),
    to = new Date(input.to);
  const settings = await attendanceSettings();
  const users = await db
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .where(
      subject
        ? eq(userTable.id, subject)
        : sql`EXISTS (SELECT 1 FROM workspace_member m WHERE m.user_id = ${userTable.id}) OR EXISTS (SELECT 1 FROM attendance_entry e WHERE e.user_id = ${userTable.id}) OR EXISTS (SELECT 1 FROM attendance_employee p WHERE p.user_id = ${userTable.id})`,
    );
  const seconds = sql`greatest(0, extract(epoch from (least(coalesce(${entry.endTime}, now()), ${input.to}::timestamptz) - greatest(${entry.startTime}, ${input.from}::timestamptz))))`;
  const pending = sql`(${entry.reviewStatus} = 'pending' OR (${entry.reviewStatus} <> 'approved' AND extract(epoch from (coalesce(${entry.endTime}, now()) - ${entry.startTime})) > (${entry.policy}->>'maxTimerHours')::numeric * 3600) OR EXISTS (SELECT 1 FROM attendance_request l WHERE l.user_id = ${entry.userId} AND l.status='approved' AND l.payload->>'kind'='leave' AND (l.payload->>'startTime')::timestamptz < coalesce(${entry.endTime},now()) AND (l.payload->>'endTime')::timestamptz > ${entry.startTime}))`;

  const totals = await db
    .select({
      userId: entry.userId,
      seconds: sql<number>`coalesce(sum(CASE WHEN NOT ${pending} THEN ${seconds} ELSE 0 END),0)::float8`,
      pendingSeconds: sql<number>`coalesce(sum(CASE WHEN ${pending} THEN ${seconds} ELSE 0 END),0)::float8`,
      unknownRateSeconds: sql<number>`coalesce(sum(CASE WHEN NOT ${pending} AND ${entry.hourlyRate} IS NULL THEN ${seconds} ELSE 0 END),0)::float8`,
      gross: sql<number>`coalesce(sum(CASE WHEN NOT ${pending} THEN ${seconds} * coalesce(${entry.hourlyRate},0) / 3600 ELSE 0 END),0)::float8`,
    })
    .from(entry)
    .where(
      and(
        isNull(entry.deletedAt),
        sql`${entry.startTime} < ${input.to}::timestamptz AND coalesce(${entry.endTime}, now()) > ${input.from}::timestamptz`,
        subject ? eq(entry.userId, subject) : undefined,
        input.projectId ? eq(entry.projectId, input.projectId) : undefined,
        input.workspaceId
          ? eq(entry.workspaceId, input.workspaceId)
          : undefined,
      ),
    )
    .groupBy(entry.userId);
  const totalByUser = new Map(totals.map((r) => [r.userId, r]));
  const arrivals = await reportArrivals(input.from, input.to, subject);
  const requests = await db
    .select()
    .from(attendanceRequestTable)
    .where(
      and(
        eq(attendanceRequestTable.status, "approved"),
        sql`${attendanceRequestTable.payload}->>'kind' = 'leave' AND (${attendanceRequestTable.payload}->>'startTime')::timestamptz < ${input.to}::timestamptz AND (${attendanceRequestTable.payload}->>'endTime')::timestamptz > ${input.from}::timestamptz`,
        subject ? eq(attendanceRequestTable.userId, subject) : undefined,
      ),
    );
  const report = [];
  for (const user of users) {
    const total = totalByUser.get(user.id);
    const leaves = requests
      .filter((r) => r.userId === user.id)
      .flatMap((r) =>
        r.payload.kind === "leave"
          ? [
              {
                mode: r.payload.mode,
                startTime: new Date(r.payload.startTime),
                endTime: new Date(r.payload.endTime),
              },
            ]
          : [],
      );
    let late = 0,
      penalty = 0,
      leaveSeconds = 0,
      leaveDays = 0;
    for (const row of arrivals.filter((r) => r.userId === user.id)) {
      const arrival = new Date(row.arrival);
      if (+arrival < +from || +arrival >= +to) continue;
      const minutes = lateMinutes(arrival, row.policy, leaves);
      late += minutes;
      penalty += minutes * row.policy.penaltyPerMinute;
    }
    for (const leave of leaves) {
      const start = Math.max(+leave.startTime, +from),
        end = Math.min(+leave.endTime, +to);
      if (end <= start) continue;
      if (leave.mode === "hourly") leaveSeconds += (end - start) / 1000;
      else {
        let day = localParts(new Date(start), settings.policy.timeZone).day;
        while (+localInstant(day, "00:00", settings.policy.timeZone) < end) {
          if (
            new Date(`${day}T12:00:00Z`).getUTCDay() !==
            (settings.policy.weekStartsOn + 6) % 7
          )
            leaveDays++;
          day = nextDay(day);
        }
      }
    }
    const money = actorId === user.id || access.permissions.includes("finance");
    const gross =
      (total?.unknownRateSeconds ?? 0) > 0
        ? null
        : Math.round(total?.gross ?? 0);
    report.push({
      userId: user.id,
      name: user.name,
      seconds: total?.seconds ?? 0,
      pendingSeconds: total?.pendingSeconds ?? 0,
      unknownRateSeconds: total?.unknownRateSeconds ?? 0,
      leaveSeconds,
      leaveDays,
      lateMinutes: late,
      gross: money ? gross : null,
      penalty: money ? penalty : null,
      net: money && gross !== null ? gross - penalty : null,
    });
  }
  return report;
}
