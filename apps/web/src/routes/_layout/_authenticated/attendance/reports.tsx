import { createFileRoute } from "@tanstack/react-router";
import { AttendanceReportsPage } from "@/components/attendance/reports-page";
export const Route = createFileRoute(
  "/_layout/_authenticated/attendance/reports",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    userId: typeof search.userId === "string" ? search.userId : undefined,
  }),
  component: ReportsRoute,
});
function ReportsRoute() {
  const { userId } = Route.useSearch();
  return <AttendanceReportsPage key={userId ?? "me"} userId={userId} />;
}
