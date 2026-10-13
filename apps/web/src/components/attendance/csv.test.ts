import { describe, expect, it } from "vite-plus/test";
import { attendanceCsv } from "./csv";
describe("attendance CSV", () => {
  it("escapes names and spreadsheet formulas without turning negative money into text", () => {
    const csv = attendanceCsv(
      [
        {
          userId: "1",
          name: '=HYPERLINK("x")',
          seconds: 3600,
          pendingSeconds: 0,
          unknownRateSeconds: 0,
          leaveSeconds: 0,
          leaveDays: 0,
          lateMinutes: 5,
          gross: 1000,
          penalty: 2000,
          net: -1000,
        },
      ],
      ["Employee"],
    );
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain('"-1000"');
    expect(csv).toContain('"01:00:00"');
  });
});
