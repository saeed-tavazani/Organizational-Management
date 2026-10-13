import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAttendanceHistory,
  useAttendanceSettings,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceQueryState } from "./query-state";
import { AttendancePagination } from "./pagination";
export function AttendanceHistory({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useAttendanceSettings();
  const [offset, setOffset] = useState(0);
  const query = useAttendanceHistory(offset, userId);
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      timeZone: settings?.policy.timeZone ?? "Asia/Tehran",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <section className="grid gap-3">
      <h2 className="font-semibold">{t("attendance:history")}</h2>
      <AttendanceQueryState
        pending={query.isPending}
        error={query.isError}
        retry={() => query.refetch()}
      />
      {query.data?.items.map((item) => (
        <article
          key={item.id}
          className="grid gap-1 rounded-lg border border-border p-3 text-xs"
        >
          <p className="font-medium">
            {t(`attendance:auditActions.${item.action.replaceAll(".", "_")}`)} ·{" "}
            {item.actorName}
          </p>
          <p className="text-muted-foreground">{date(item.createdAt)}</p>
          {item.startBefore && (
            <p>
              {t("attendance:oldInterval")}: {date(item.startBefore)} —{" "}
              {item.endBefore ? date(item.endBefore) : t("attendance:running")}
            </p>
          )}
          {item.startAfter && (
            <p>
              {t("attendance:newInterval")}: {date(item.startAfter)} —{" "}
              {item.endAfter ? date(item.endAfter) : t("attendance:running")}
            </p>
          )}
        </article>
      ))}
      <AttendancePagination
        offset={offset}
        total={query.data?.total ?? 0}
        onChange={setOffset}
      />
    </section>
  );
}
