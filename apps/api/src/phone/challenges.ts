import { randomUUID, timingSafeEqual } from "node:crypto";
import { APIError, getSessionFromCtx } from "better-auth/api";
import type { phoneNumber } from "better-auth/plugins";
type GenericEndpointContext = NonNullable<
  Parameters<NonNullable<Parameters<typeof phoneNumber>[0]>["sendOTP"]>[1]
>;
import { and, eq, gt, sql } from "drizzle-orm";
import db, { schema } from "../database";
import { hashPhoneCode } from "../bale/crypto";

export async function phonePurpose(ctx: GenericEndpointContext) {
  const change =
    ctx.path === "/phone-number/send-otp"
      ? ctx.headers?.get("x-phone-purpose") === "change-phone"
      : ctx.body?.updatePhoneNumber === true;
  const session = change ? await getSessionFromCtx(ctx) : null;
  if (change && !session)
    throw new APIError("UNAUTHORIZED", {
      message: "Sign in before changing your phone number",
    });
  return {
    purpose: change ? "change-phone" : "sign-in",
    userId: session?.user.id ?? null,
  };
}

export async function limitPhoneSend(phone: string, ip: string) {
  for (const [key, max, seconds] of [
    [`phone-minute:${phone}`, 1, 60],
    [`phone-hour:${phone}`, 5, 3600],
    [`ip:${ip}`, 30, 3600],
  ] as const) {
    const bucket = hashPhoneCode(key);
    const [row] = await db
      .insert(schema.phoneRateLimitTable)
      .values({
        key: bucket,
        count: 1,
        expiresAt: new Date(Date.now() + seconds * 1000),
      })
      .onConflictDoUpdate({
        target: schema.phoneRateLimitTable.key,
        set: {
          count: sql`CASE WHEN ${schema.phoneRateLimitTable.expiresAt} <= now() THEN 1 ELSE ${schema.phoneRateLimitTable.count} + 1 END`,
          expiresAt: sql`CASE WHEN ${schema.phoneRateLimitTable.expiresAt} <= now() THEN now() + ${seconds} * interval '1 second' ELSE ${schema.phoneRateLimitTable.expiresAt} END`,
        },
      })
      .returning();
    if (row && row.count > max)
      throw new APIError("TOO_MANY_REQUESTS", {
        message: "Please wait before requesting another code",
      });
  }
}

export async function storePhoneChallenge(
  phoneNumber: string,
  code: string,
  ctx: GenericEndpointContext,
) {
  const { purpose, userId } = await phonePurpose(ctx);
  const existing = await db.query.userTable.findFirst({
    where: eq(schema.userTable.phoneNumber, phoneNumber),
  });
  const expiresAt = new Date(Date.now() + 300_000);
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`phone-challenge:${phoneNumber}`}))`,
    );
    await tx
      .delete(schema.phoneChallengeTable)
      .where(
        and(
          eq(schema.phoneChallengeTable.phoneNumber, phoneNumber),
          eq(schema.phoneChallengeTable.purpose, purpose),
        ),
      );
    await tx.insert(schema.phoneChallengeTable).values({
      id,
      phoneNumber,
      purpose,
      userId: userId ?? existing?.id,
      codeHash: hashPhoneCode(`${id}:${code}`),
      expiresAt,
    });
    // Better Auth writes its default plaintext OTP before calling sendOTP.
    // Verification is owned by the purpose-bound hashed challenge instead.
    await tx
      .delete(schema.verificationTable)
      .where(eq(schema.verificationTable.identifier, phoneNumber));
    await tx.insert(schema.baleDeliveryTable).values({
      id,
      userId: userId ?? existing?.id,
      phoneNumber,
      kind: "otp",
      resourceId: id,
      payload: (await import("../bale/crypto")).encryptBalePayload({
        message: { otp: code },
      }),
      expiresAt,
    });
  });
}

export async function consumePhoneChallenge(
  phoneNumber: string,
  code: string,
  ctx: GenericEndpointContext,
) {
  const { purpose, userId } = await phonePurpose(ctx);
  const existingUser =
    purpose === "sign-in" && !userId
      ? await db.query.userTable.findFirst({
          where: eq(schema.userTable.phoneNumber, phoneNumber),
        })
      : null;
  const challengeUserId = userId ?? existingUser?.id ?? null;
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`phone-challenge:${phoneNumber}`}))`,
    );
    const [challenge] = await tx
      .select()
      .from(schema.phoneChallengeTable)
      .where(
        and(
          eq(schema.phoneChallengeTable.phoneNumber, phoneNumber),
          eq(schema.phoneChallengeTable.purpose, purpose),
          gt(schema.phoneChallengeTable.expiresAt, new Date()),
        ),
      )
      .for("update")
      .limit(1);
    if (
      !challenge ||
      challenge.userId !== challengeUserId ||
      challenge.attempts >= 5
    )
      return false;
    const expected = Buffer.from(challenge.codeHash, "hex");
    const actual = Buffer.from(hashPhoneCode(`${challenge.id}:${code}`), "hex");
    if (!timingSafeEqual(expected, actual)) {
      await tx
        .update(schema.phoneChallengeTable)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(schema.phoneChallengeTable.id, challenge.id));
      return false;
    }
    await tx
      .delete(schema.phoneChallengeTable)
      .where(eq(schema.phoneChallengeTable.id, challenge.id));
    return true;
  });
}
