import { useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startAttendanceTimer,
  stopAttendanceTimer,
} from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
import {
  useAttendanceEntries,
  useAttendanceProjects,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceSelect } from "./select-field";
import { AttendanceQueryState } from "./query-state";
import { AttendancePagination } from "./pagination";
import { AttendanceEntryList } from "./entry-list";
import { AttendanceRequestDialog } from "./request-dialog";
import { attendanceDuration } from "./format";
import { useAttendanceClock } from "./use-clock";

export function AttendanceTrackerPage() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [offset, setOffset] = useState(0);
  const entries = useAttendanceEntries(offset);
  const projects = useAttendanceProjects();
  const start = useAttendanceMutation(startAttendanceTimer);
  const stop = useAttendanceMutation(stopAttendanceTimer);
  const running = entries.data?.running;
  const now = useAttendanceClock(Boolean(running));
  const elapsed = running
    ? Math.max(0, (now - Date.parse(running.startTime)) / 1000)
    : 0;
  const needsReview =
    running &&
    (running.needsReview || elapsed > running.policy.maxTimerHours * 3600);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("attendance:tracker")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("attendance:trackerHint")}
          </p>
        </div>
        <AttendanceRequestDialog kind="correction" />
      </div>
      <form
        className="grid items-end gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (running) stop.mutate(running.id);
          else if (projectId)
            start.mutate(
              { projectId, description },
              { onSuccess: () => setDescription("") },
            );
        }}
      >
        <AttendanceSelect
          label={t("attendance:project")}
          value={running?.projectId ?? projectId}
          onChange={setProjectId}
          disabled={Boolean(running) || projects.isPending}
          options={
            running
              ? [
                  {
                    value: running.projectId,
                    label: `${running.workspaceName} / ${running.projectName}`,
                  },
                ]
              : (projects.data ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.workspaceName} / ${p.name}`,
                }))
          }
        />
        <label className="grid gap-2 text-sm font-medium">
          {t("attendance:description")}
          <Input
            placeholder={t("attendance:descriptionPlaceholder")}
            value={running?.description ?? description}
            disabled={Boolean(running)}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="flex h-9 items-center justify-center gap-2 text-2xl font-semibold tabular-nums sm:h-8">
          <Timer className="size-5 text-muted-foreground" aria-hidden="true" />
          <span dir="ltr" className="font-mono">
            {attendanceDuration(elapsed)}
          </span>
        </div>
        <Button
          type="submit"
          variant={running ? "destructive" : "default"}
          disabled={
            entries.isPending ||
            entries.isError ||
            start.isPending ||
            stop.isPending ||
            (!running && (!projectId || projects.isError))
          }
          loading={start.isPending || stop.isPending}
        >
          {running ? (
            <Square aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {t(running ? "attendance:stop" : "attendance:start")}
        </Button>
      </form>
      {needsReview && (
        <p
          role="status"
          className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
        >
          {t("attendance:timerReviewHint")}
        </p>
      )}
      {!projects.isPending &&
        !projects.isError &&
        !projects.data?.length &&
        !running && (
          <p className="text-sm text-muted-foreground">
            {t("attendance:noProjects")}
          </p>
        )}
      <AttendanceQueryState
        pending={entries.isPending || projects.isPending}
        error={entries.isError || projects.isError}
        retry={() => {
          void entries.refetch();
          void projects.refetch();
        }}
      />
      {entries.data && (
        <>
          <AttendanceEntryList entries={entries.data.entries} />
          {!entries.data.entries.length && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("attendance:noEntries")}
            </p>
          )}
          <AttendancePagination
            offset={offset}
            total={entries.data.total}
            onChange={setOffset}
          />
        </>
      )}
    </div>
  );
}
