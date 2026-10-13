import { followingDay } from "./format";
export type AttendancePeriod = "week" | "month" | "year" | "custom";
export function attendancePeriodRange(
  period: Exclude<AttendancePeriod, "custom">,
  day: string,
  weekStartsOn: number,
  persian: boolean,
) {
  const shift = (value: string, amount: number) =>
    new Date(Date.parse(`${value}T12:00:00Z`) + amount * 86400000)
      .toISOString()
      .slice(0, 10);
  if (period === "week") {
    const difference =
      (new Date(`${day}T12:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7;
    const from = shift(day, -difference);
    return { from, end: shift(from, 6) };
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    calendar: persian ? "persian" : "gregory",
    year: "numeric",
    ...(period === "month" ? { month: "numeric" as const } : {}),
  });
  const identity = (value: string) =>
    formatter.format(new Date(`${value}T12:00:00Z`));
  const current = identity(day);
  let from = day,
    end = day;
  for (let i = 0; i < 367; i++) {
    const prior = shift(from, -1);
    if (identity(prior) !== current) break;
    from = prior;
  }
  for (let i = 0; i < 367; i++) {
    const next = followingDay(end);
    if (identity(next) !== current) break;
    end = next;
  }
  return { from, end };
}
