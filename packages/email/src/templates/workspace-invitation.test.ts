import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import enUS from "../../../../i18n/en-US.json";
import faIR from "../../../../i18n/fa-IR.json";
import WorkspaceInvitationEmail from "./workspace-invitation";

describe("WorkspaceInvitationEmail", () => {
  it("renders the invitation in Persian for a Persian locale", async () => {
    const html = await render(
      createElement(WorkspaceInvitationEmail, {
        workspaceName: "تیم محصول",
        inviterName: "سارا",
        inviterEmail: "sara@example.com",
        invitationLink: "https://kaneo.example/invite/abc",
        to: "invite@example.com",
        locale: "fa-IR",
        copy: faIR.invitations.email,
      }),
    );

    expect(html).toContain("پیوستن به تیم محصول");
    expect(html).toContain("پذیرش دعوت‌نامه");
    expect(html).toContain("سارا (sara@example.com)");
  });
});

describe("WorkspaceInvitationEmail default copy", () => {
  it("renders without a copy prop so previews and exports work", async () => {
    const html = await render(
      createElement(WorkspaceInvitationEmail, {
        workspaceName: "Acme Inc",
        inviterName: "John Doe",
        inviterEmail: "john@acme.com",
        invitationLink: "https://kaneo.app/invite/abc123",
        to: "invitee@example.com",
      }),
    );

    expect(html).toContain("Join Acme Inc");
    expect(html).toContain("Accept invitation");
  });

  it("keeps the fallback in sync with the en-US bundle", async () => {
    const html = await render(
      createElement(WorkspaceInvitationEmail, {
        workspaceName: "Acme Inc",
        inviterName: "John Doe",
        inviterEmail: "john@acme.com",
        invitationLink: "https://kaneo.app/invite/abc123",
        to: "invitee@example.com",
      }),
    );
    const withEnUs = await render(
      createElement(WorkspaceInvitationEmail, {
        workspaceName: "Acme Inc",
        inviterName: "John Doe",
        inviterEmail: "john@acme.com",
        invitationLink: "https://kaneo.app/invite/abc123",
        to: "invitee@example.com",
        copy: enUS.invitations.email,
      }),
    );

    expect(html).toBe(withEnUs);
  });

  it("renders the Persian role and expiry labels", async () => {
    const html = await render(
      createElement(WorkspaceInvitationEmail, {
        workspaceName: "تیم محصول",
        inviterName: "سارا",
        inviterEmail: "sara@example.com",
        invitationLink: "https://kaneo.example/invite/abc",
        to: "invite@example.com",
        locale: "fa-IR",
        role: "عضو",
        expiresAt: new Date("2026-10-13T12:00:00Z"),
        copy: faIR.invitations.email,
      }),
    );

    expect(html).toContain("جزئیات دعوت‌نامه");
    expect(html).toContain("عضو");
  });
});
