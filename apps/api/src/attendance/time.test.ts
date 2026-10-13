import { describe, expect, it } from "vite-plus/test";
import {
  defaultAttendancePolicy,
  lateMinutes,
  localInstant,
  localParts,
  needsTimerReview,
} from "./time";
const policy = {
  ...defaultAttendancePolicy,
  enabled: true,
  weekStartsOn: 6 as const,
};
describe("attendance time rules", () => {
  it("charges only complete minutes beyond the grace period", () => {
    expect(lateMinutes(new Date("2026-10-12T08:50:59+03:30"), policy, [])).toBe(
      5,
    );
    expect(lateMinutes(new Date("2026-10-12T08:45:59+03:30"), policy, [])).toBe(
      0,
    );
  });
  it("allows holiday work without a lateness penalty", () => {
    expect(lateMinutes(new Date("2026-10-16T12:00:00+03:30"), policy, [])).toBe(
      0,
    );
  });
  it("moves the grace period to the end of contiguous morning leave", () => {
    const leaves = [
      {
        startTime: new Date("2026-10-12T08:30:00+03:30"),
        endTime: new Date("2026-10-12T10:00:00+03:30"),
      },
      {
        startTime: new Date("2026-10-12T10:00:00+03:30"),
        endTime: new Date("2026-10-12T11:00:00+03:30"),
      },
    ];
    expect(
      lateMinutes(new Date("2026-10-12T11:20:00+03:30"), policy, leaves),
    ).toBe(5);
  });
  it("does not charge on approved daily leave or when penalties are disabled", () => {
    const leaves = [
      {
        startTime: new Date("2026-10-12T00:00:00+03:30"),
        endTime: new Date("2026-10-13T00:00:00+03:30"),
      },
    ];
    expect(
      lateMinutes(new Date("2026-10-12T12:00:00+03:30"), policy, leaves),
    ).toBe(0);
    expect(
      lateMinutes(
        new Date("2026-10-12T12:00:00+03:30"),
        { ...policy, enabled: false },
        [],
      ),
    ).toBe(0);
  });
  it("round trips local midnight independently of the host timezone", () => {
    const time = localInstant("2026-10-13", "00:00", "Asia/Tehran");
    expect(time.toISOString()).toBe("2026-10-12T20:30:00.000Z");
    expect(localParts(time, "Asia/Tehran").day).toBe("2026-10-13");
  });
  it("continues an over-limit timer but excludes it until review", () => {
    const entry = {
      startTime: new Date("2026-10-12T00:00:00Z"),
      endTime: null,
      policy,
      reviewStatus: "valid",
    };
    expect(needsTimerReview(entry, new Date("2026-10-12T12:00:00Z"))).toBe(
      false,
    );
    expect(needsTimerReview(entry, new Date("2026-10-12T12:00:01Z"))).toBe(
      true,
    );
    expect(
      needsTimerReview(
        { ...entry, reviewStatus: "approved" },
        new Date("2026-10-13T12:00:00Z"),
      ),
    ).toBe(false);
  });
});
