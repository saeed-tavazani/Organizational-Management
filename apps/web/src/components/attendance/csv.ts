import type { AttendanceReportRow } from "@/fetchers/attendance";
import { attendanceDuration } from "./format";
export function attendanceCsv(rows: AttendanceReportRow[], headers: string[]) {
  const cell = (value: string | number | null) => {
    const text = String(value ?? "");
    const safe =
      /^[=+\-@\t\r]/.test(text) && typeof value === "string"
        ? `'${text}`
        : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      headers.map(cell).join(","),
      ...rows.map((r) =>
        [
          r.name,
          attendanceDuration(r.seconds),
          attendanceDuration(r.pendingSeconds),
          attendanceDuration(r.unknownRateSeconds),
          attendanceDuration(r.leaveSeconds),
          r.leaveDays,
          r.lateMinutes,
          r.gross,
          r.penalty,
          r.net,
        ]
          .map(cell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
