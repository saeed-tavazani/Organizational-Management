import { createFileRoute } from "@tanstack/react-router";
import { AttendanceFinancePage } from "@/components/attendance/finance-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/attendance/finance",
)({ component: AttendanceFinancePage });
