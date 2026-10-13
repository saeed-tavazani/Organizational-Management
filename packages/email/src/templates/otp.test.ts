import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import { OTP_EXPIRY_SECONDS } from "../otp-expiry";
import OtpEmail from "./otp";

describe("OtpEmail", () => {
  it("renders OTP and verification copy in HTML", async () => {
    const html = await render(createElement(OtpEmail, { otp: "123456" }));
    expect(html).toContain("123456");
    expect(html).toContain("verification code");
  });

  it.each([
    ["en-US", "This code expires in 5 minutes."],
    ["fa-IR", "این کد پس از ۵ دقیقه منقضی می‌شود."],
  ])("describes the server expiry in %s", async (locale, expiry) => {
    expect(OTP_EXPIRY_SECONDS).toBe(300);
    const html = await render(
      createElement(OtpEmail, { otp: "123456", locale }),
    );
    expect(html).toContain(expiry);
    expect(html).not.toContain("15 minute");
  });
  it("renders Persian copy for a Persian locale", async () => {
    const html = await render(
      createElement(OtpEmail, { otp: "123456", locale: "fa-IR" }),
    );
    expect(html).toContain("کد تأیید");
    expect(html).toContain("ایمیل امنیتی Kaneo");
    expect(html).toContain('dir="rtl"');
  });

  it("renders the request details in the recipient's language", async () => {
    const context = {
      otp: "482913",
      email: "maya@example.com",
      instance: "kaneo.example",
      requestedAt: new Date("2026-10-11T14:12:00Z"),
      device: { browser: "Safari", os: "iPhone" },
    };
    const english = await render(createElement(OtpEmail, context));
    expect(english).toContain("Request details");
    expect(english).toContain("Safari on iPhone");
    expect(english).toContain("Oct 11, 2026");
    expect(english).toContain("kaneo.example");

    const persian = await render(
      createElement(OtpEmail, { ...context, locale: "fa-IR" }),
    );
    expect(persian).toContain("جزئیات درخواست");
    expect(persian).toContain("Safari در iPhone");
    expect(persian).toContain('dir="rtl"');
  });

  it("falls back to English for removed locale preferences", async () => {
    const html = await render(
      createElement(OtpEmail, { otp: "123456", locale: "de-DE" }),
    );
    expect(html).toContain("Sign in to Kaneo");
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
  });

  it("hides the request details when nothing is known", async () => {
    const html = await render(createElement(OtpEmail, { otp: "482913" }));
    expect(html).not.toContain("Request details");
  });
});
