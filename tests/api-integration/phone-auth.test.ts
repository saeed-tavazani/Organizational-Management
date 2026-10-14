import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { and, eq } from "drizzle-orm";
import { createApp } from "../../apps/api/src/index";
import db, { schema } from "../../apps/api/src/database";
import { decryptBalePayload } from "../../apps/api/src/bale/crypto";
import { hashPhoneCode } from "../../apps/api/src/bale/crypto";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

const headers = {
  "Content-Type": "application/json",
  Origin: "http://localhost:5173",
};
async function post(
  path: string,
  body: unknown,
  cookie?: string,
  extra: Record<string, string> = {},
) {
  return createApp().app.request(`/api/auth${path}`, {
    method: "POST",
    headers: { ...headers, ...extra, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function cookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((part) => part.split(";")[0])
    .join("; ");
}
async function code(phone = "+989123456789") {
  const challenge = await db.query.phoneChallengeTable.findFirst({
    where: eq(schema.phoneChallengeTable.phoneNumber, phone),
  });
  const row = challenge
    ? await db.query.baleDeliveryTable.findFirst({
        where: and(
          eq(schema.baleDeliveryTable.id, challenge.id),
          eq(schema.baleDeliveryTable.kind, "otp"),
        ),
      })
    : null;
  if (!row) throw new Error("OTP delivery missing");
  return decryptBalePayload<{ message: { otp: string } }>(row.payload).message
    .otp;
}
async function signUp(phone = "09123456789") {
  const sent = await post("/phone-number/send-otp", { phoneNumber: phone });
  expect(sent.status, await sent.clone().text()).toBe(200);
  const response = await post("/phone-number/verify", {
    phoneNumber: phone,
    code: await code(),
    name: "Phone User",
  });
  expect(response.status).toBe(200);
  return { response, cookie: cookie(response), body: await response.json() };
}

describe("phone authentication through Bale", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("BALE_SAFIR_API_ACCESS_KEY", "test-key");
    vi.stubEnv("BALE_SAFIR_BOT_ID", "123");
    process.env.DISABLE_REGISTRATION = "false";
    process.env.KANEO_CLOUD = "false";
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    process.env.DISABLE_REGISTRATION = "false";
  });

  it("creates a phone-only account, preserves the supplied name, and elects the first admin", async () => {
    const login = await signUp();
    expect(login.body.user).toMatchObject({
      name: "Phone User",
      email: null,
      phoneNumber: "+989123456789",
      phoneNumberVerified: true,
    });
    const user = await db.query.userTable.findFirst();
    expect(user?.role).toBe("admin");
    expect(user?.email).toMatch(/@phone\.montask\.invalid$/);
    expect(await db.query.accountTable.findMany()).toHaveLength(0);
    expect(await db.query.verificationTable.findMany()).toHaveLength(0);
    const me = await createApp().app.request("/api/user/me", {
      headers: { Cookie: login.cookie },
    });
    expect(await me.json()).toMatchObject({
      email: null,
      phoneNumber: "+989123456789",
    });
  });
  it("lets an existing account sign in with a new phone code", async () => {
    const existing = await createWorkspaceMember();
    await db
      .update(schema.userTable)
      .set({ phoneNumber: "+989123456789", phoneNumberVerified: true })
      .where(eq(schema.userTable.id, existing.user.id));
    expect(
      (await post("/phone-number/send-otp", { phoneNumber: "09123456789" }))
        .status,
    ).toBe(200);
    const otp = await code();
    const challenge = await db.query.phoneChallengeTable.findFirst({
      where: eq(schema.phoneChallengeTable.phoneNumber, "+989123456789"),
    });
    expect(challenge).toMatchObject({
      userId: existing.user.id,
      purpose: "sign-in",
    });
    expect(challenge?.codeHash).toBe(hashPhoneCode(`${challenge?.id}:${otp}`));
    const response = await post("/phone-number/verify", {
      phoneNumber: "09123456789",
      code: otp,
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect((await response.json()).user.id).toBe(existing.user.id);
  });
  it("consumes a code once even when redeemed concurrently", async () => {
    await post("/phone-number/send-otp", { phoneNumber: "09123456789" });
    const otp = await code();
    const results = await Promise.all(
      [1, 2].map(() =>
        post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
          name: "Phone User",
        }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(await db.query.userTable.findMany()).toHaveLength(1);
  });
  it("rejects the sixth attempt after five wrong codes", async () => {
    await post("/phone-number/send-otp", { phoneNumber: "09123456789" });
    const otp = await code();
    const wrong = otp === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 5; attempt++)
      expect(
        (
          await post("/phone-number/verify", {
            phoneNumber: "09123456789",
            code: wrong,
            name: "User",
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
          name: "User",
        })
      ).status,
    ).toBe(400);
  });
  it("requires a name before a code can create an account", async () => {
    await post("/phone-number/send-otp", { phoneNumber: "09123456789" });
    const otp = await code();
    expect(
      (
        await post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
          name: "User",
        })
      ).status,
    ).toBe(200);
  });
  it("requires the invited phone in an existing invite-only instance", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    process.env.DISABLE_REGISTRATION = "true";
    await post("/phone-number/send-otp", { phoneNumber: "09123456789" });
    const otp = await code();
    expect(
      (
        await post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
          name: "User",
        })
      ).status,
    ).toBe(403);
    await db.insert(schema.invitationTable).values({
      workspaceId: owner.workspace.id,
      inviterId: owner.user.id,
      email: "invite@phone.montask.invalid",
      phoneNumber: "+989123456789",
      role: "member",
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(
      (
        await post("/phone-number/verify", {
          phoneNumber: "09123456789",
          code: otp,
          name: "User",
        })
      ).status,
    ).toBe(200);
  });
  it("does not use a sign-in code to attach a different number", async () => {
    const login = await signUp();
    await post("/phone-number/send-otp", { phoneNumber: "09123456780" });
    expect(
      (
        await post(
          "/phone-number/verify",
          {
            phoneNumber: "09123456780",
            code: await code("+989123456780"),
            updatePhoneNumber: true,
          },
          login.cookie,
        )
      ).status,
    ).toBe(400);
  });
  it("attaches a number using a session-bound change code", async () => {
    const login = await signUp();
    expect(
      (
        await post(
          "/phone-number/send-otp",
          { phoneNumber: "09123456780" },
          login.cookie,
          { "x-phone-purpose": "change-phone" },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await post(
          "/phone-number/verify",
          {
            phoneNumber: "09123456780",
            code: await code("+989123456780"),
            updatePhoneNumber: true,
          },
          login.cookie,
        )
      ).status,
    ).toBe(200);
    expect((await db.query.userTable.findFirst())?.phoneNumber).toBe(
      "+989123456780",
    );
  });
  it("cannot remove the only sign-in identity", async () => {
    const login = await signUp();
    expect(
      (await post("/update-user", { phoneNumber: null }, login.cookie)).status,
    ).toBe(400);
  });
  it("rejects phone/password sign-in and technical email sign-in", async () => {
    expect(
      (
        await post("/sign-in/phone-number", {
          phoneNumber: "09123456789",
          password: "password",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post("/email-otp/send-verification-otp", {
          email: "internal@phone.montask.invalid",
          type: "sign-in",
        })
      ).status,
    ).toBe(400);
  });
  it("rate limits self-hosted sends before writing a second delivery", async () => {
    expect(
      (await post("/phone-number/send-otp", { phoneNumber: "09123456789" }))
        .status,
    ).toBe(200);
    expect(
      (await post("/phone-number/send-otp", { phoneNumber: "09123456789" }))
        .status,
    ).toBe(429);
    expect(await db.query.baleDeliveryTable.findMany()).toHaveLength(1);
  });
});
