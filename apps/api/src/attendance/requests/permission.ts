import type { AttendancePermission } from "@kaneo/permissions";
import type { AttendanceRequestPayload } from "../types";

export function requestPermission(
  payload: AttendanceRequestPayload,
): AttendancePermission {
  return payload.kind === "rate"
    ? "rates"
    : payload.kind === "leave" || payload.kind === "cancel"
      ? "leave"
      : "corrections";
}
