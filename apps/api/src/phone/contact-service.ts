import { isContactConflict } from "./is-contact-conflict";
import { isSmtpConfigured } from "@kaneo/email";
import { isBaleConfigured } from "../bale/config";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { sendOtpEmail } from "@kaneo/email";
import { and, eq, gt, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db, { schema } from "../database";
import { realEmail, normalizeIranPhone } from "@kaneo/contacts";
import { hashPhoneCode } from "../bale/crypto";
import { limitPhoneSend } from "./challenges";
import { revokeUserConnections } from "../ws";
import { publishEvent } from "../events";

export async function sendContactEmailCode(userId: string, email: string) {
  if (!isSmtpConfigured())
    throw new HTTPException(400, {
      message: "Email delivery is not configured",
    });
  const normalized = email.trim().toLowerCase();
  if (!realEmail(normalized))
    throw new HTTPException(400, { message: "A real email is required" });
  await limitPhoneSend(`email:${userId}`, userId);
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const id = `contact-email:${userId}`;
  await db
    .insert(schema.phoneChallengeTable)
    .values({
      id,
      phoneNumber: normalized,
      userId,
      purpose: "link-email",
      codeHash: hashPhoneCode(`${id}:${code}`),
      expiresAt: new Date(Date.now() + 300_000),
    })
    .onConflictDoUpdate({
      target: schema.phoneChallengeTable.id,
      set: {
        phoneNumber: normalized,
        codeHash: hashPhoneCode(`${id}:${code}`),
        attempts: 0,
        expiresAt: new Date(Date.now() + 300_000),
      },
    });
  await sendOtpEmail(normalized, "Montask", { otp: code });
}

export async function verifyContactEmail(userId: string, code: string) {
  const accepted = await db
    .transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(schema.phoneChallengeTable)
        .where(
          and(
            eq(schema.phoneChallengeTable.id, `contact-email:${userId}`),
            eq(schema.phoneChallengeTable.userId, userId),
            gt(schema.phoneChallengeTable.expiresAt, new Date()),
          ),
        )
        .for("update");
      if (!challenge || challenge.attempts >= 5) return false;
      if (
        !timingSafeEqual(
          Buffer.from(challenge.codeHash, "hex"),
          Buffer.from(hashPhoneCode(`${challenge.id}:${code}`), "hex"),
        )
      ) {
        await tx
          .update(schema.phoneChallengeTable)
          .set({ attempts: challenge.attempts + 1 })
          .where(eq(schema.phoneChallengeTable.id, challenge.id));
        return false;
      }
      const [other] = await tx
        .select({ id: schema.userTable.id })
        .from(schema.userTable)
        .where(eq(schema.userTable.email, challenge.phoneNumber));
      if (other && other.id !== userId)
        throw new HTTPException(409, {
          message: "Email belongs to another account",
        });
      await tx
        .update(schema.userTable)
        .set({ email: challenge.phoneNumber, emailVerified: true })
        .where(eq(schema.userTable.id, userId));
      await tx
        .delete(schema.phoneChallengeTable)
        .where(eq(schema.phoneChallengeTable.id, challenge.id));
      return true;
    })
    .catch((error: unknown) => {
      if (isContactConflict(error))
        throw new HTTPException(409, {
          message: "Email belongs to another account",
        });
      throw error;
    });
  if (!accepted)
    throw new HTTPException(400, { message: "Invalid or expired code" });
  await publishEvent("user.identity.updated", { userId });
}

export async function removeContactEmail(userId: string) {
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.id, userId))
      .for("update");
    if (!user?.phoneNumberVerified)
      throw new HTTPException(400, {
        message: "Keep a verified sign-in method",
      });
    await tx
      .update(schema.userTable)
      .set({
        email: `${randomUUID()}@phone.montask.invalid`,
        emailVerified: false,
      })
      .where(eq(schema.userTable.id, userId));
    await tx
      .delete(schema.accountTable)
      .where(
        and(
          eq(schema.accountTable.userId, userId),
          eq(schema.accountTable.providerId, "credential"),
        ),
      );
    return { success: true };
  });
  await publishEvent("user.identity.updated", { userId });
  return result;
}

export async function recoverPhone(
  userId: string,
  value: string,
  administratorId: string,
) {
  if (!isBaleConfigured())
    throw new HTTPException(400, { message: "Bale is not configured" });
  const phoneNumber = normalizeIranPhone(value);
  if (!phoneNumber)
    throw new HTTPException(400, { message: "Invalid Iranian phone number" });
  await db
    .transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`recover:${userId}`}))`,
      );
      const [user] = await tx
        .select()
        .from(schema.userTable)
        .where(eq(schema.userTable.id, userId))
        .for("update");
      if (!user) throw new HTTPException(404, { message: "User not found" });
      const [other] = await tx
        .select({ id: schema.userTable.id })
        .from(schema.userTable)
        .where(eq(schema.userTable.phoneNumber, phoneNumber));
      if (other && other.id !== userId)
        throw new HTTPException(409, {
          message: "Phone number belongs to another account",
        });
      await tx
        .update(schema.userTable)
        .set({ phoneNumber, phoneNumberVerified: false })
        .where(eq(schema.userTable.id, userId));
      await tx
        .insert(schema.phoneRecoveryAuditTable)
        .values({ userId, administratorId });
      await tx
        .delete(schema.sessionTable)
        .where(eq(schema.sessionTable.userId, userId));
      await tx
        .delete(schema.accountTable)
        .where(eq(schema.accountTable.userId, userId));
      await tx
        .update(schema.apikeyTable)
        .set({ enabled: false })
        .where(eq(schema.apikeyTable.referenceId, userId));
      await tx
        .delete(schema.phoneChallengeTable)
        .where(eq(schema.phoneChallengeTable.userId, userId));
    })
    .catch((error: unknown) => {
      if (isContactConflict(error))
        throw new HTTPException(409, {
          message: "Phone number belongs to another account",
        });
      throw error;
    });
  await revokeUserConnections(userId);
  await publishEvent("user.phone.recovery", { userId, administratorId });
  console.info("Phone recovery requested", { userId, administratorId });
  return { success: true };
}
