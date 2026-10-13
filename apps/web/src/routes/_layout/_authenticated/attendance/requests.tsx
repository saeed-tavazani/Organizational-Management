import { createFileRoute } from "@tanstack/react-router";
import { AttendanceRequestsPage } from "@/components/attendance/requests-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/attendance/requests",
)({ component: AttendanceRequestsPage });
