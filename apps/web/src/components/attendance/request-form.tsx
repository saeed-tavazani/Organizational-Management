import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  postAttendanceRequest,
  type AttendanceEntry,
  type AttendanceRequestInput,
} from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
import {
  useAttendanceProjects,
  useAttendanceSettings,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceDateField } from "./date-field";
import { AttendanceSelect } from "./select-field";
import { companyDay, companyInstant, followingDay } from "./format";

export function AttendanceRequestForm({
  kind,
  entry,
  requestId,
  userId,
  onSaved,
}: {
  kind: AttendanceRequestInput["payload"]["kind"];
  entry?: AttendanceEntry;
  requestId?: string;
  userId?: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { data: settings } = useAttendanceSettings();
  const { data: projects = [] } = useAttendanceProjects();
  const timeZone = settings?.policy.timeZone ?? "Asia/Tehran";
  const day = companyDay(new Date(), timeZone);
  const clock = (date?: string) =>
    date
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone,
          hourCycle: "h23",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date))
      : "08:30";
  const [startDay, setStartDay] = useState(
    entry ? companyDay(new Date(entry.startTime), timeZone) : day,
  );
  const [endDay, setEndDay] = useState(
    entry?.endTime ? companyDay(new Date(entry.endTime), timeZone) : day,
  );
  const [startClock, setStartClock] = useState(clock(entry?.startTime));
  const [endClock, setEndClock] = useState(
    entry?.endTime ? clock(entry.endTime) : "09:30",
  );
  const [mode, setMode] = useState("hourly");
  const [projectId, setProjectId] = useState(entry?.projectId ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState("");
  const mutation = useAttendanceMutation(postAttendanceRequest);
  const interval = kind === "leave" || kind === "correction";
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        let payload: AttendanceRequestInput["payload"];
        if (kind === "rate") payload = { kind, amount: Number(amount) };
        else if (kind === "review") {
          if (!entry) return;
          payload = { kind, entryId: entry.id };
        } else if (kind === "cancel") {
          if (!requestId) return;
          payload = { kind, requestId };
        } else {
          const startTime = companyInstant(
            startDay,
            mode === "daily" && kind === "leave" ? "00:00" : startClock,
            timeZone,
          );
          const endTime = companyInstant(
            mode === "daily" && kind === "leave"
              ? followingDay(endDay)
              : endDay,
            mode === "daily" && kind === "leave" ? "00:00" : endClock,
            timeZone,
          );
          if (Date.parse(endTime) <= Date.parse(startTime)) {
            setError(t("attendance:errors.interval"));
            return;
          }
          if (kind === "leave")
            payload = {
              kind,
              mode: mode === "daily" ? "daily" : "hourly",
              startTime,
              endTime,
            };
          else {
            if (!projectId) {
              setError(t("attendance:errors.project"));
              return;
            }
            payload = {
              kind,
              projectId,
              entryId: entry?.id,
              startTime,
              endTime,
              description,
              remove,
            };
          }
        }
        mutation.mutate({ payload, reason, userId }, { onSuccess: onSaved });
      }}
    >
      {kind === "leave" && (
        <AttendanceSelect
          label={t("attendance:leaveMode")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "hourly", label: t("attendance:hourly") },
            { value: "daily", label: t("attendance:daily") },
          ]}
        />
      )}
      {interval && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <AttendanceDateField
              label={t("attendance:startDate")}
              value={startDay}
              onChange={setStartDay}
            />
            <AttendanceDateField
              label={t(
                kind === "leave" && mode === "daily"
                  ? "attendance:endDateInclusive"
                  : "attendance:endDate",
              )}
              value={endDay}
              onChange={setEndDay}
            />
          </div>
          {!(kind === "leave" && mode === "daily") && (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">
                {t("attendance:startTime")}
                <Input
                  type="time"
                  value={startClock}
                  onChange={(e) => setStartClock(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm">
                {t("attendance:endTime")}
                <Input
                  type="time"
                  value={endClock}
                  onChange={(e) => setEndClock(e.target.value)}
                  required
                />
              </label>
            </div>
          )}
        </>
      )}
      {kind === "correction" && (
        <>
          <AttendanceSelect
            label={t("attendance:project")}
            value={projectId}
            onChange={setProjectId}
            disabled={Boolean(entry)}
            options={
              entry
                ? [
                    {
                      value: entry.projectId,
                      label: `${entry.workspaceName} / ${entry.projectName}`,
                    },
                  ]
                : projects.map((p) => ({
                    value: p.id,
                    label: `${p.workspaceName} / ${p.name}`,
                  }))
            }
          />
          <label className="grid gap-2 text-sm">
            {t("attendance:description")}
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>
          {entry && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remove}
                onChange={(e) => setRemove(e.target.checked)}
              />
              {t("attendance:requestRemoval")}
            </label>
          )}
        </>
      )}
      {kind === "rate" && (
        <label className="grid gap-2 text-sm">
          {t("attendance:hourlyRate")}
          <Input
            type="number"
            min={0}
            max={100000000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <span className="text-xs text-muted-foreground">
            {t("attendance:rateHint")}
          </span>
        </label>
      )}
      <label className="grid gap-2 text-sm">
        {t("attendance:reason")}
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          maxLength={2000}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {t("attendance:timezoneHint", { timeZone })}
      </p>
      {(error || mutation.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {error || t("attendance:errors.save")}
        </p>
      )}
      <Button
        type="submit"
        disabled={mutation.isPending || !settings}
        loading={mutation.isPending}
      >
        {t("attendance:submitRequest")}
      </Button>
    </form>
  );
}
