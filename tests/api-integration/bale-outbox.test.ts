import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { eq } from "drizzle-orm";
import * as email from "@kaneo/email";
import db, { schema } from "../../apps/api/src/database";
import { enqueueBale, processBaleOutbox } from "../../apps/api/src/bale/outbox";
import { encryptBalePayload } from "../../apps/api/src/bale/crypto";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { createApp } from "../../apps/api/src/index";

describe("durable Bale delivery", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("BALE_SAFIR_API_ACCESS_KEY", "test-key");
    vi.stubEnv("BALE_SAFIR_BOT_ID", "123");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  async function challenge() {
    const id = "test-challenge";
    await db.insert(schema.phoneChallengeTable).values({
      id,
      phoneNumber: "+989123456789",
      purpose: "sign-in",
      codeHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await enqueueBale({
      id,
      phoneNumber: "+989123456789",
      kind: "otp",
      resourceId: id,
      message: { otp: "123456" },
      expiresAt: new Date(Date.now() + 60_000),
    });
    return id;
  }
  it("retries with the same request id, then clears terminal sensitive payloads", async () => {
    const id = await challenge();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary outage"))
      .mockResolvedValue(new Response(JSON.stringify({ message_id: "sent" })));
    vi.stubGlobal("fetch", fetch);
    await processBaleOutbox();
    expect((await db.query.baleDeliveryTable.findFirst())?.status).toBe(
      "retry",
    );
    await db
      .update(schema.baleDeliveryTable)
      .set({ nextAttemptAt: new Date(0) })
      .where(eq(schema.baleDeliveryTable.id, id));
    await processBaleOutbox();
    expect(
      fetch.mock.calls.map((call) => JSON.parse(call[1].body).request_id),
    ).toEqual([id, id]);
    expect(await db.query.baleDeliveryTable.findFirst()).toMatchObject({
      status: "accepted",
      attempts: 2,
      payload: "",
    });
  });
  it("stops after three temporary failures", async () => {
    const id = await challenge();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("outage")));
    for (let attempt = 0; attempt < 3; attempt++) {
      await processBaleOutbox();
      await db
        .update(schema.baleDeliveryTable)
        .set({ nextAttemptAt: new Date(0) })
        .where(eq(schema.baleDeliveryTable.id, id));
    }
    expect(await db.query.baleDeliveryTable.findFirst()).toMatchObject({
      status: "failed",
      attempts: 3,
    });
  });
  it("never sends expired or consumed authentication codes", async () => {
    await challenge();
    await db.delete(schema.phoneChallengeTable);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await processBaleOutbox();
    expect(fetch).not.toHaveBeenCalled();
    expect((await db.query.baleDeliveryTable.findFirst())?.status).toBe(
      "expired",
    );
  });
  it("rechecks invitation permission before sending and preserves a failed invitation", async () => {
    const actor = await createWorkspaceMember({ role: "owner" });
    const [invite] = await db
      .insert(schema.invitationTable)
      .values({
        workspaceId: actor.workspace.id,
        inviterId: actor.user.id,
        email: "invitation@phone.montask.invalid",
        phoneNumber: "+989123456789",
        role: "member",
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning();
    await enqueueBale({
      phoneNumber: "+989123456789",
      kind: "invitation",
      resourceId: invite!.id,
      message: { text: "Invitation" },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error_data: { code: 20 } })),
        ),
    );
    await processBaleOutbox();
    expect((await db.query.baleDeliveryTable.findFirst())?.status).toBe(
      "failed",
    );
    expect((await db.query.invitationTable.findFirst())?.status).toBe(
      "pending",
    );
  });
  it("does not fall back a phone-change code to email", async () => {
    const account = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ phoneNumber: "+989123456789", phoneNumberVerified: true })
      .where(eq(schema.userTable.id, account.user.id));
    const id = "change-challenge";
    await db.insert(schema.phoneChallengeTable).values({
      id,
      phoneNumber: "+989123456789",
      purpose: "change-phone",
      userId: account.user.id,
      codeHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await db.insert(schema.baleDeliveryTable).values({
      id,
      phoneNumber: "+989123456789",
      userId: account.user.id,
      kind: "otp",
      resourceId: id,
      payload: encryptBalePayload({ message: { otp: "123456" } }),
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.spyOn(email, "isSmtpConfigured").mockReturnValue(true);
    const sender = vi.spyOn(email, "sendOtpEmail");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error_data: { code: 20 } })),
        ),
    );
    await processBaleOutbox();
    expect(sender).not.toHaveBeenCalled();
    expect((await db.query.baleDeliveryTable.findFirst())?.status).toBe(
      "failed",
    );
  });
  it("creates an independent email sign-in challenge without verifying the phone", async () => {
    const account = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ phoneNumber: "+989123456789", phoneNumberVerified: false })
      .where(eq(schema.userTable.id, account.user.id));
    const id = await challenge();
    await db
      .update(schema.baleDeliveryTable)
      .set({ userId: account.user.id })
      .where(eq(schema.baleDeliveryTable.id, id));
    vi.spyOn(email, "isSmtpConfigured").mockReturnValue(true);
    const sender = vi.spyOn(email, "sendOtpEmail");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error_data: { code: 20 } })),
        ),
    );
    await processBaleOutbox();
    await drainSignInEmails();
    expect((await db.query.baleDeliveryTable.findFirst())?.status).toBe(
      "email_fallback",
    );
    const code = (sender.mock.calls[0]![2] as { otp: string }).otp;
    const response = await createApp().app.request(
      "/api/auth/sign-in/email-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({ email: account.user.email, otp: code }),
      },
    );
    expect(response.status).toBe(200);
    expect((await db.query.userTable.findFirst())?.phoneNumberVerified).toBe(
      false,
    );
  });
});
