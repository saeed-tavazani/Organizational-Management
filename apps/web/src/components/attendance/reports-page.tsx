import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import {
  useAttendanceReportProjects,
  useAttendanceProfile,
  useAttendanceReport,
  useAttendanceSettings,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceDateField } from "./date-field";
import { AttendanceSelect } from "./select-field";
import { AttendanceQueryState } from "./query-state";
import {
  attendanceDuration,
  companyDay,
  companyInstant,
  followingDay,
} from "./format";
import { attendancePeriodRange, type AttendancePeriod } from "./period";
import { attendanceCsv } from "./csv";

export function AttendanceReportsPage({ userId }: { userId?: string }) {
  const { t, i18n } = useTranslation();
  const { data: session } = authClient.useSession();
  const { data: settings } = useAttendanceSettings();
  const { data: profile } = useAttendanceProfile();
  const { data: projects = [] } = useAttendanceReportProjects();
  const workspaces = [
    ...new Map(
      projects.map((p) => [
        p.workspaceId,
        { value: p.workspaceId, label: p.workspaceName },
      ]),
    ).values(),
  ];
  const timeZone = settings?.policy.timeZone ?? "Asia/Tehran";
  const [period, setPeriod] = useState<AttendancePeriod>("month");
  const [anchor, setAnchor] = useState(companyDay(new Date(), timeZone));
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customEnd, setCustomEnd] = useState(anchor);
  const [scope, setScope] = useState(userId ?? "me");
  const [projectId, setProjectId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const range =
    period === "custom"
      ? { from: customFrom, end: customEnd }
      : attendancePeriodRange(
          period,
          anchor,
          settings?.policy.weekStartsOn ?? 0,
          i18n.dir() === "rtl",
        );
  const query = {
    scope: scope === "all" ? ("all" as const) : ("me" as const),
    from: companyInstant(range.from, "00:00", timeZone),
    to: companyInstant(followingDay(range.end), "00:00", timeZone),
    userId:
      scope === "all" ? undefined : scope === "me" ? session?.user.id : scope,
    projectId: projectId || undefined,
    workspaceId: workspaceId || undefined,
  };
  const report = useAttendanceReport(query);
  const headers = [
    "employee",
    "workHours",
    "pendingHours",
    "unknownRateHours",
    "hourlyLeave",
    "dailyLeave",
    "lateMinutes",
    "gross",
    "penalty",
    "net",
  ].map((key) => t(`attendance:${key}`));
  const money = (value: number | null) =>
    value === null ? "—" : new Intl.NumberFormat(i18n.language).format(value);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("attendance:myReports")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("attendance:reportHint")}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!report.data || report.isFetching}
          onClick={() =>
            saveAs(
              new Blob([attendanceCsv(report.data ?? [], headers)], {
                type: "text/csv;charset=utf-8",
              }),
              `attendance-${range.from}-${range.end}.csv`,
            )
          }
        >
          <Download aria-hidden="true" />
          {t("attendance:export")}
        </Button>
      </div>
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <AttendanceSelect
          label={t("attendance:period")}
          value={period}
          onChange={(value) => setPeriod(value as AttendancePeriod)}
          options={["week", "month", "year", "custom"].map((value) => ({
            value,
            label: t(`attendance:periods.${value}`),
          }))}
        />
        {period === "custom" ? (
          <>
            <AttendanceDateField
              label={t("attendance:startDate")}
              value={customFrom}
              onChange={setCustomFrom}
            />
            <AttendanceDateField
              label={t("attendance:endDateInclusive")}
              value={customEnd}
              onChange={setCustomEnd}
            />
          </>
        ) : (
          <AttendanceDateField
            label={t("attendance:periodAnchor")}
            value={anchor}
            onChange={setAnchor}
          />
        )}
        {profile?.permissions.includes("reports") && (
          <AttendanceSelect
            label={t("attendance:reportScope")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "me", label: t("attendance:myReports") },
              { value: "all", label: t("attendance:allEmployees") },
              ...(userId
                ? [{ value: userId, label: t("attendance:selectedEmployee") }]
                : []),
            ]}
          />
        )}
      </div>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t("attendance:filters")}
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AttendanceSelect
            label={t("attendance:project")}
            value={projectId || "all"}
            onChange={(v) => setProjectId(v === "all" ? "" : v)}
            options={[
              { value: "all", label: t("attendance:allProjects") },
              ...projects
                .filter((p) => !workspaceId || p.workspaceId === workspaceId)
                .map((p) => ({
                  value: p.id,
                  label: `${p.workspaceName} / ${p.name}`,
                })),
            ]}
          />
          <AttendanceSelect
            label={t("attendance:workspaceId")}
            value={workspaceId || "all"}
            onChange={(v) => {
              setWorkspaceId(v === "all" ? "" : v);
              setProjectId("");
            }}
            options={[
              { value: "all", label: t("attendance:allWorkspaces") },
              ...workspaces,
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("attendance:filterHint")}
        </p>
      </details>
      <p className="text-xs text-muted-foreground">
        {t("attendance:timezoneHint", { timeZone })} ·{" "}
        {t("attendance:currency")}
      </p>
      <AttendanceQueryState
        pending={report.isPending}
        error={report.isError}
        retry={() => report.refetch()}
      />
      {report.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "workHours",
                value: attendanceDuration(
                  report.data.reduce((s, r) => s + r.seconds, 0),
                ),
              },
              {
                label: "pendingHours",
                value: attendanceDuration(
                  report.data.reduce((s, r) => s + r.pendingSeconds, 0),
                ),
              },
              {
                label: "lateMinutes",
                value: new Intl.NumberFormat(i18n.language).format(
                  report.data.reduce((s, r) => s + r.lateMinutes, 0),
                ),
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground">
                  {t(`attendance:${stat.label}`)}
                </p>
                <p
                  className="mt-2 text-2xl font-semibold tabular-nums"
                  dir="ltr"
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell dir="ltr">
                      {attendanceDuration(r.seconds)}
                    </TableCell>
                    <TableCell dir="ltr">
                      {attendanceDuration(r.pendingSeconds)}
                    </TableCell>
                    <TableCell dir="ltr">
                      {attendanceDuration(r.unknownRateSeconds)}
                    </TableCell>
                    <TableCell dir="ltr">
                      {attendanceDuration(r.leaveSeconds)}
                    </TableCell>
                    <TableCell>{r.leaveDays}</TableCell>
                    <TableCell>{r.lateMinutes}</TableCell>
                    <TableCell>{money(r.gross)}</TableCell>
                    <TableCell>{money(r.penalty)}</TableCell>
                    <TableCell className="font-semibold">
                      {money(r.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("attendance:estimateHint")}
          </p>
        </>
      )}
    </div>
  );
}
