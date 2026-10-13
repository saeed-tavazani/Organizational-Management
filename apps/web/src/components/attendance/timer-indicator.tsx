import { useNavigate } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAttendanceTimer } from "@/hooks/queries/attendance/use-attendance";
import { Button } from "@/components/ui/button";
import { attendanceDuration } from "./format";
import { useAttendanceClock } from "./use-clock";
export function AttendanceTimerIndicator() {
  const { data } = useAttendanceTimer();
  const now = useAttendanceClock(Boolean(data));
  const navigate = useNavigate();
  const { t } = useTranslation();
  if (!data) return null;
  return (
    <Button
      variant="outline"
      className="w-full justify-between text-xs"
      onClick={() => navigate({ to: "/attendance" })}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Timer className="text-primary" aria-hidden="true" />
        <span className="truncate">{data.projectName}</span>
      </span>
      <span
        className="font-mono tabular-nums"
        aria-label={t("attendance:running")}
      >
        {attendanceDuration((now - Date.parse(data.startTime)) / 1000)}
      </span>
    </Button>
  );
}
