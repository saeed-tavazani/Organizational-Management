import { describe, expect, it } from "vite-plus/test";
import { attendancePeriodRange } from "./period";
describe("attendance report periods", () => {
  it("uses the shared week start", () => {
    expect(attendancePeriodRange("week", "2026-10-13", 6, true)).toEqual({
      from: "2026-10-10",
      end: "2026-10-16",
    });
  });
  it("uses Persian month boundaries instead of Gregorian ones", () => {
    expect(attendancePeriodRange("month", "2026-10-13", 6, true)).toEqual({
      from: "2026-09-23",
      end: "2026-10-22",
    });
    expect(attendancePeriodRange("month", "2026-10-13", 6, false)).toEqual({
      from: "2026-10-01",
      end: "2026-10-31",
    });
  });
  it("includes the Persian leap day and full Gregorian leap year", () => {
    expect(attendancePeriodRange("year", "2025-03-20", 6, true)).toEqual({
      from: "2024-03-20",
      end: "2025-03-20",
    });
    expect(attendancePeriodRange("year", "2024-06-15", 1, false)).toEqual({
      from: "2024-01-01",
      end: "2024-12-31",
    });
  });
});
