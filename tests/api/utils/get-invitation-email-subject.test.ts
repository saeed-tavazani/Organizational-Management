import { describe, expect, it } from "vite-plus/test";
import { getInvitationEmailSubject } from "../../../apps/api/src/utils/get-invitation-email-subject";

describe("getInvitationEmailSubject", () => {
  it("uses Persian copy for Persian locales", () => {
    expect(getInvitationEmailSubject("fa-IR", "آلیس", "تیم محصول")).toBe(
      "آلیس شما را به پیوستن به تیم محصول در Kaneo دعوت کرده است",
    );
  });

  it("uses the English copy by default", () => {
    const locale = "en-US";
    const inviterName = "Alice";
    const workspaceName = "Producto";

    const subject = getInvitationEmailSubject(
      locale,
      inviterName,
      workspaceName,
    );

    expect(subject).toBe("Alice invited you to join Producto on Kaneo");
  });

  it("falls back to English for a locale no longer supported by the app", () => {
    expect(getInvitationEmailSubject("de-DE", "Alice", "Produkt")).toBe(
      "Alice invited you to join Produkt on Kaneo",
    );
  });
});
