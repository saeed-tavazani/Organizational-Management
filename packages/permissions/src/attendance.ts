export const attendancePermissions = [
  "reports",
  "finance",
  "bank",
  "leave",
  "corrections",
  "rates",
  "settings",
  "roles",
] as const;
export type AttendancePermission = (typeof attendancePermissions)[number];
export const attendanceRoles = ["employee", "hr", "finance"] as const;
export type AttendanceRole = (typeof attendanceRoles)[number];
export type AttendanceGrants = Record<AttendanceRole, AttendancePermission[]>;
export const defaultAttendanceGrants: AttendanceGrants = {
  employee: [],
  hr: ["reports", "leave", "corrections"],
  finance: ["reports", "finance", "bank", "rates"],
};
