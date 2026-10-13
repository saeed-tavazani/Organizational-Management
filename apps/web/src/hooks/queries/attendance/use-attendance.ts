import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import {
  getAttendanceTimer,
  getAttendanceHistory,
  getAttendanceReportProjects,
  getAttendanceEmployees,
  getAttendanceEntries,
  getAttendanceProfile,
  getAttendanceProjects,
  getAttendanceReport,
  getAttendanceRequests,
  getAttendanceSettings,
  type AttendanceReportInput,
} from "@/fetchers/attendance";

function useKey(section: string, ...parts: unknown[]) {
  const { data } = authClient.useSession();
  return ["attendance", data?.user.id, section, ...parts] as const;
}
export function useAttendanceSettings() {
  return useQuery({
    queryKey: useKey("settings"),
    queryFn: getAttendanceSettings,
  });
}
export function useAttendanceProfile(userId?: string) {
  return useQuery({
    queryKey: useKey("profile", userId),
    queryFn: () => getAttendanceProfile(userId),
  });
}
export function useAttendanceProjects() {
  return useQuery({
    queryKey: useKey("projects"),
    queryFn: getAttendanceProjects,
  });
}
export function useAttendanceEntries(offset = 0, userId?: string) {
  return useQuery({
    queryKey: useKey("entries", userId, offset),
    queryFn: () => getAttendanceEntries(offset, userId),
  });
}
export function useAttendanceRequests(offset = 0, userId?: string) {
  return useQuery({
    queryKey: useKey("requests", userId, offset),
    queryFn: () => getAttendanceRequests(offset, userId),
  });
}
export function useAttendanceEmployees(offset = 0, enabled = true) {
  return useQuery({
    queryKey: useKey("employees", offset),
    queryFn: () => getAttendanceEmployees(offset),
    enabled,
  });
}
export function useAttendanceReport(query: AttendanceReportInput) {
  return useQuery({
    queryKey: useKey("report", query),
    queryFn: () => getAttendanceReport(query),
    enabled: Date.parse(query.to) > Date.parse(query.from),
  });
}

export function useAttendanceReportProjects() {
  return useQuery({
    queryKey: useKey("report-projects"),
    queryFn: getAttendanceReportProjects,
  });
}

export function useAttendanceHistory(
  offset = 0,
  userId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: useKey("history", userId, offset),
    queryFn: () => getAttendanceHistory(offset, userId),
    enabled,
  });
}

export function useAttendanceTimer() {
  return useQuery({ queryKey: useKey("timer"), queryFn: getAttendanceTimer });
}
