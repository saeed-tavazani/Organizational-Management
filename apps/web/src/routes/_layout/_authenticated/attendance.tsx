import { createFileRoute } from "@tanstack/react-router";
import { AttendanceShell } from "@/components/attendance/shell";
export const Route = createFileRoute("/_layout/_authenticated/attendance")({
  component: AttendanceShell,
});
