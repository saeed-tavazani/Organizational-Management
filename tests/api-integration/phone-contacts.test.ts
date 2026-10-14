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
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import {
  sendContactEmailCode,
  verifyContactEmail,
  removeContactEmail,
  recoverPhone,
} from "../../apps/api/src/phone/contact-service";
import { createWorkspaceMember } from "./helpers/fixtures";
import { resetTestDatabase } from "./helpers/database";

describe("verified account contacts", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("BALE_SAFIR_API_ACCESS_KEY", "test-key");
    vi.stubEnv("BALE_SAFIR_BOT_ID", "123");
    vi.spyOn(email, "isSmtpConfigured").mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it("changes the real email only after verification and keeps the same user id", async () => {
    const account = await createWorkspaceMember();
    const sender = vi.spyOn(email, "sendOtpEmail");
    await sendContactEmailCode(account.user.id, "another@example.com");
    expect((await db.query.userTable.findFirst())?.email).toBe(
      account.user.email,
    );
    const code = (sender.mock.calls[0]![2] as { otp: string }).otp;
    await verifyContactEmail(account.user.id, code);
    expect(await db.query.userTable.findFirst()).toMatchObject({
      id: account.user.id,
      email: "another@example.com",
      emailVerified: true,
    });
    await expect(verifyContactEmail(account.user.id, code)).rejects.toThrow(
      "Invalid or expired code",
    );
  });
  it("refuses to merge two accounts when verifying an already-owned email", async () => {
    const account = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    const sender = vi.spyOn(email, "sendOtpEmail");
    await sendContactEmailCode(account.user.id, other.user.email);
    await expect(
      verifyContactEmail(
        account.user.id,
        (sender.mock.calls[0]![2] as { otp: string }).otp,
      ),
    ).rejects.toThrow("another account");
    expect(await db.query.userTable.findMany()).toHaveLength(2);
  });
  it("keeps the last verified identity when removing email", async () => {
    const account = await createWorkspaceMember();
    await expect(removeContactEmail(account.user.id)).rejects.toThrow(
      "verified sign-in method",
    );
    await db
      .update(schema.userTable)
      .set({ phoneNumber: "+989123456789", phoneNumberVerified: true })
      .where(eq(schema.userTable.id, account.user.id));
    await removeContactEmail(account.user.id);
    expect(await db.query.userTable.findFirst()).toMatchObject({
      emailVerified: false,
      phoneNumberVerified: true,
    });
  });
  it("audits recovery, revokes sessions, and leaves the new phone unverified", async () => {
    const account = await createWorkspaceMember();
    await db.insert(schema.sessionTable).values({
      id: "old-session",
      token: "old-token",
      userId: account.user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await recoverPhone(account.user.id, "09123456789", "administrator");
    expect(await db.query.userTable.findFirst()).toMatchObject({
      phoneNumber: "+989123456789",
      phoneNumberVerified: false,
    });
    expect(await db.query.sessionTable.findMany()).toHaveLength(0);
    expect(await db.query.phoneRecoveryAuditTable.findFirst()).toMatchObject({
      userId: account.user.id,
      administratorId: "administrator",
    });
    await expect(
      (await auth.$context).internalAdapter.createSession(account.user.id),
    ).rejects.toThrow("Verify the recovered phone");
    expect(
      await db.query.accountTable.findMany({
        where: eq(schema.accountTable.userId, account.user.id),
      }),
    ).toHaveLength(0);
  });
});
