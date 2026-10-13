import { useState } from "react";
import { useTranslation } from "react-i18next";
import { attendancePermissions } from "@kaneo/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  putAttendanceSettings,
  type AttendanceSettings,
} from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
import { useUserPreferencesStore } from "@/store/user-preferences";
import { AttendanceSelect } from "./select-field";
export function AttendanceSettingsForm({
  initial,
}: {
  initial: AttendanceSettings;
}) {
  const { t } = useTranslation();
  const preferredWeek = useUserPreferencesStore((s) => s.weekStartsOn);
  const [policy, setPolicy] = useState({
    ...initial.policy,
    weekStartsOn: initial.configured
      ? initial.policy.weekStartsOn
      : preferredWeek,
  });
  const [grants, setGrants] = useState(initial.grants);
  const mutation = useAttendanceMutation(
    putAttendanceSettings,
    t("attendance:saved"),
  );
  const numberFields = [
    "graceMinutes",
    "penaltyPerMinute",
    "maxTimerHours",
  ] as const;
  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ policy, grants });
      }}
    >
      <section className="grid gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{t("attendance:companyPolicy")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("attendance:policyHint")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <AttendanceSelect
            label={t("settings:preferencesPage.firstDayOfWeek")}
            value={String(policy.weekStartsOn)}
            onChange={(value) =>
              setPolicy({ ...policy, weekStartsOn: Number(value) as 0 | 1 | 6 })
            }
            options={[
              {
                value: "0",
                label: t("settings:preferencesPage.weekStartsOnSunday"),
              },
              {
                value: "1",
                label: t("settings:preferencesPage.weekStartsOnMonday"),
              },
              {
                value: "6",
                label: t("settings:preferencesPage.weekStartsOnSaturday"),
              },
            ]}
          />
          <label className="grid gap-2 text-sm">
            {t("attendance:timeZone")}
            <Input
              value={policy.timeZone}
              dir="ltr"
              required
              onChange={(e) =>
                setPolicy({ ...policy, timeZone: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm">
            {t("attendance:companyStart")}
            <Input
              type="time"
              required
              value={policy.startTime}
              onChange={(e) =>
                setPolicy({ ...policy, startTime: e.target.value })
              }
            />
          </label>
          {numberFields.map((field) => (
            <label className="grid gap-2 text-sm" key={field}>
              {t(`attendance:${field}`)}
              <Input
                type="number"
                required
                min={field === "maxTimerHours" ? 1 : 0}
                max={
                  field === "maxTimerHours"
                    ? 168
                    : field === "graceMinutes"
                      ? 1440
                      : 10000000
                }
                step={field === "maxTimerHours" ? 0.5 : 1}
                value={policy[field]}
                onChange={(e) =>
                  setPolicy({ ...policy, [field]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t("attendance:enablePenalty")}</span>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(enabled) => setPolicy({ ...policy, enabled })}
          />
        </label>
      </section>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{t("attendance:rolePermissions")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("attendance:selfApprovalHint")}
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {(["employee", "hr", "finance"] as const).map((role) => (
            <fieldset
              key={role}
              className="rounded-lg border border-border p-4"
            >
              <legend className="px-1 text-sm font-semibold">
                {t(`attendance:roles.${role}`)}
              </legend>
              <div className="grid gap-3">
                {attendancePermissions
                  .filter((p) => p !== "settings" && p !== "roles")
                  .map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={grants[role].includes(permission)}
                        onChange={(e) =>
                          setGrants({
                            ...grants,
                            [role]: e.target.checked
                              ? [...grants[role], permission]
                              : grants[role].filter((p) => p !== permission),
                          })
                        }
                      />
                      {t(`attendance:permissions.${permission}`)}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("attendance:errors.save")}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("attendance:saved")}
        </p>
      )}
      <Button
        type="submit"
        className="justify-self-start"
        disabled={mutation.isPending}
        loading={mutation.isPending}
      >
        {t("attendance:save")}
      </Button>
    </form>
  );
}
