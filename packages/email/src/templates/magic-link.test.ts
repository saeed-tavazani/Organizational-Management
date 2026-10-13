import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import MagicLinkEmail from "./magic-link";

describe("MagicLinkEmail", () => {
  it("renders Persian copy with right-to-left direction", async () => {
    const html = await render(
      createElement(MagicLinkEmail, {
        magicLink: "https://kaneo.example/auth",
        locale: "fa-IR",
      }),
    );
    expect(html).toContain("ورود به Kaneo");
    expect(html).toContain('dir="rtl"');
  });
});
