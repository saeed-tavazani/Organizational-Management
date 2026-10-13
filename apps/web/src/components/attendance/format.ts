export function attendanceDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function companyDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function companyInstant(day: string, time: string, timeZone: string) {
  const desired = Date.parse(`${day}T${time}:00Z`);
  let result = desired;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const p = Object.fromEntries(
      formatter
        .formatToParts(new Date(result))
        .map((part) => [part.type, part.value]),
    );
    result +=
      desired -
      Date.parse(
        `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
      );
  }
  return new Date(result).toISOString();
}
export function followingDay(day: string) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
}
