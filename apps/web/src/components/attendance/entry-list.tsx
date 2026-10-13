import { useTranslation } from "react-i18next";
import { useAttendanceSettings } from "@/hooks/queries/attendance/use-attendance";
import type { AttendanceEntry } from "@/fetchers/attendance";
import { attendanceDuration, companyDay } from "./format";
import { AttendanceRequestDialog } from "./request-dialog";

export function AttendanceEntryList({
  entries,
}: {
  entries: AttendanceEntry[];
}) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useAttendanceSettings();
  const timeZone = settings?.policy.timeZone ?? "Asia/Tehran";
  const groups = new Map<string, AttendanceEntry[]>();
  for (const entry of entries) {
    const day = companyDay(new Date(entry.startTime), timeZone);
    const rows = groups.get(day) ?? [];
    rows.push(entry);
    groups.set(day, rows);
  }
  return (
    <div className="grid gap-5">
      {[...groups].map(([day, rows]) => (
        <section
          key={day}
          className="overflow-hidden rounded-xl border border-border"
        >
          <header className="flex flex-wrap justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3 text-sm">
            <h2 className="font-medium">
              {new Intl.DateTimeFormat(i18n.language, {
                timeZone,
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(new Date(rows[0]!.startTime))}
            </h2>
            <span className="font-mono tabular-nums" dir="ltr">
              {attendanceDuration(
                rows.reduce(
                  (sum, r) =>
                    sum +
                    (r.endTime
                      ? (Date.parse(r.endTime) - Date.parse(r.startTime)) / 1000
                      : 0),
                  0,
                ),
              )}
            </span>
          </header>
          <div className="divide-y divide-border">
            {rows.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {entry.description || entry.projectName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.workspaceName} / {entry.projectName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(i18n.language, {
                    timeZone,
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(entry.startTime))}{" "}
                  —{" "}
                  {entry.endTime
                    ? new Intl.DateTimeFormat(i18n.language, {
                        timeZone,
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.endTime))
                    : t("attendance:running")}
                </span>
                <strong dir="ltr" className="font-mono tabular-nums">
                  {entry.endTime
                    ? attendanceDuration(
                        (Date.parse(entry.endTime) -
                          Date.parse(entry.startTime)) /
                          1000,
                      )
                    : "—"}
                </strong>
                {entry.needsReview && (
                  <span className="rounded-md bg-warning/10 px-2 py-1 text-xs text-warning-foreground">
                    {t("attendance:needsReview")}
                  </span>
                )}
                {entry.endTime && (
                  <div className="flex gap-2">
                    <AttendanceRequestDialog kind="correction" entry={entry} />
                    {entry.needsReview && (
                      <AttendanceRequestDialog kind="review" entry={entry} />
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
