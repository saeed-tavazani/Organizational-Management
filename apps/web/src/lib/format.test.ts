import { describe, expect, it } from "vite-plus/test";
import { formatDate } from "./format";

describe("Persian calendar labels", () => {
  it("keeps localized dates aligned with Gregorian project grids", () => {
    const date = new Date(2026, 9, 13);
    const options = { day: "numeric", month: "long", year: "numeric" } as const;
    expect(formatDate(date, options, "fa-IR")).toBe(
      new Intl.DateTimeFormat("fa-IR", {
        ...options,
        calendar: "gregory",
      }).format(date),
    );
  });
});
