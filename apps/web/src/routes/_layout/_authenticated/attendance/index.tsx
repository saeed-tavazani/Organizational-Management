import { createFileRoute } from "@tanstack/react-router";
import { AttendanceTrackerPage } from "@/components/attendance/tracker-page";
export const Route = createFileRoute("/_layout/_authenticated/attendance/")({
  component: AttendanceTrackerPage,
});
