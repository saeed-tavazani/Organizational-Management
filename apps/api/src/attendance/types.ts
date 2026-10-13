export type AttendancePolicy = {
  weekStartsOn: 0 | 1 | 6;
  timeZone: string;
  startTime: string;
  graceMinutes: number;
  penaltyPerMinute: number;
  maxTimerHours: number;
  enabled: boolean;
};
export type AttendanceRequestPayload =
  | {
      kind: "leave";
      mode: "hourly" | "daily";
      startTime: string;
      endTime: string;
    }
  | { kind: "rate"; amount: number }
  | {
      kind: "correction";
      entryId?: string;
      projectId: string;
      startTime: string;
      endTime: string;
      description: string;
      remove: boolean;
    }
  | { kind: "cancel"; requestId: string }
  | { kind: "review"; entryId: string };
