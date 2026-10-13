import { useEffect } from "react";
import { useAttendanceSettings } from "@/hooks/queries/attendance/use-attendance";
import { useUserPreferencesStore } from "@/store/user-preferences";
export function useSharedWeekStart() {
  const { data } = useAttendanceSettings();
  const setWeekStartsOn = useUserPreferencesStore((s) => s.setWeekStartsOn);
  useEffect(() => {
    if (data?.configured) setWeekStartsOn(data.policy.weekStartsOn);
  }, [data?.configured, data?.policy.weekStartsOn, setWeekStartsOn]);
}
