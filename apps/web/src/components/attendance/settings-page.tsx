import { useTranslation } from "react-i18next";
import { SettingsPage } from "@/components/settings/settings-page";
import {
  useAttendanceProfile,
  useAttendanceSettings,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceSettingsForm } from "./settings-form";
import { AttendanceQueryState } from "./query-state";
export function AttendanceSettingsPage() {
  const { t } = useTranslation();
  const settings = useAttendanceSettings();
  const profile = useAttendanceProfile();
  return (
    <SettingsPage
      title={t("attendance:settings")}
      description={t("attendance:settingsHint")}
    >
      <AttendanceQueryState
        pending={settings.isPending || profile.isPending}
        error={settings.isError || profile.isError}
        retry={() => {
          void settings.refetch();
          void profile.refetch();
        }}
      />
      {settings.data &&
        profile.data &&
        (profile.data.role === "admin" ? (
          <AttendanceSettingsForm initial={settings.data} />
        ) : (
          <p role="alert">{t("attendance:errors.permission")}</p>
        ))}
    </SettingsPage>
  );
}
