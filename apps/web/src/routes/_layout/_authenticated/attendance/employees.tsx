import { createFileRoute } from "@tanstack/react-router";
import { AttendanceEmployeesPage } from "@/components/attendance/employees-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/attendance/employees",
)({ component: AttendanceEmployeesPage });
