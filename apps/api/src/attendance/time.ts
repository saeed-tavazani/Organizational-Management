import type { AttendancePolicy } from "./types";

export const defaultAttendancePolicy: AttendancePolicy = {
  weekStartsOn: 0,
  timeZone: "Asia/Tehran",
  startTime: "08:30",
  graceMinutes: 15,
  penaltyPerMinute: 2000,
  maxTimerHours: 12,
  enabled: false,
};

export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    day: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function localInstant(day: string, time: string, timeZone: string) {
  const desired = Date.parse(`${day}T${time}:00Z`);
  let result = desired;
  for (let i = 0; i < 4; i++) {
    const parts = localParts(new Date(result), timeZone);
    const observed = Date.parse(
      `${parts.day}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}Z`,
    );
    result += desired - observed;
  }
  return new Date(result);
}

export function nextDay(day: string) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
}

export function lateMinutes(
  arrival: Date,
  policy: AttendancePolicy,
  leaves: { startTime: Date; endTime: Date }[],
) {
  const day = localParts(arrival, policy.timeZone).day;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (!policy.enabled || weekday === (policy.weekStartsOn + 6) % 7) return 0;
  let expected = localInstant(day, policy.startTime, policy.timeZone).getTime();
  for (const leave of [...leaves].sort((a, b) => +a.startTime - +b.startTime)) {
    if (+leave.startTime <= expected && +leave.endTime > expected)
      expected = +leave.endTime;
  }
  return Math.max(
    0,
    Math.floor((+arrival - expected) / 60000) - policy.graceMinutes,
  );
}

export function needsTimerReview(
  entry: {
    startTime: Date;
    endTime: Date | null;
    policy: AttendancePolicy;
    reviewStatus: string;
  },
  now = new Date(),
) {
  return (
    entry.reviewStatus === "pending" ||
    (entry.reviewStatus !== "approved" &&
      +(entry.endTime ?? now) - +entry.startTime >
        entry.policy.maxTimerHours * 3600000)
  );
}
