import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import PasswordResetEmail from "./password-reset";

describe("PasswordResetEmail", () => {
  it("renders Persian copy with right-to-left direction", async () => {
    const html = await render(
      createElement(PasswordResetEmail, {
        resetLink: "https://kaneo.example/reset",
        locale: "fa-IR",
      }),
    );
    expect(html).toContain("بازنشانی گذرواژه");
    expect(html).toContain('dir="rtl"');
  });
});
