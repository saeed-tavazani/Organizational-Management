import { describe, expect, it } from "vite-plus/test";
import { normalizeIranPhone, realEmail } from "./iran-phone.js";

describe("Iranian phone identities", () => {
  it.each([
    "09123456789",
    "+989123456789",
    "989123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "٠٩١٢٣٤٥٦٧٨٩",
    "0912 345-6789",
  ])("normalizes %s", (input) => {
    expect(normalizeIranPhone(input)).toBe("+989123456789");
  });
  it.each([
    "",
    "02112345678",
    "+441234567890",
    "0912345678",
    "091234567890",
    "0912abc6789",
  ])("rejects %s", (input) => {
    expect(normalizeIranPhone(input)).toBeNull();
  });
  it("never exposes a technical phone email as a contact address", () => {
    expect(realEmail("random@phone.montask.invalid")).toBeNull();
    expect(realEmail("me@example.com")).toBe("me@example.com");
  });
});
