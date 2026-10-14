import { eq } from "drizzle-orm";
import db, { schema } from "../database";
import { isBaleConfigured } from "./config";
import { enqueueBale } from "./outbox";

export async function enqueueAccountMessage(
  email: string,
  kind: "magic-link" | "password-reset" | "trial",
  subject: string,
  text: string,
  url: string,
  emailAlreadySent: boolean,
  expiresAt: Date,
  resourceId?: string,
) {
  if (!isBaleConfigured()) return;
  const user = await db.query.userTable.findFirst({
    where: eq(schema.userTable.email, email),
  });
  if (!user?.phoneNumber || !user.phoneNumberVerified || user.banned) return;
  // A magic link proves control of the email address. Forward it only when
  // that address was already verified on this account.
  if (kind === "magic-link" && !user.emailVerified) return;
  await enqueueBale({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    kind,
    resourceId,
    message: { text, url },
    fallback: { subject, text, url },
    emailAlreadySent,
    expiresAt,
  });
}
