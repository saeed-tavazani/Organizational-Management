import { createFileRoute } from "@tanstack/react-router";
import { AttendanceSettingsPage } from "@/components/attendance/settings-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/admin/attendance",
)({ component: AttendanceSettingsPage });
