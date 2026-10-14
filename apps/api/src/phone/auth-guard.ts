import { answerPhoneInvitation } from "../invitation/controllers/answer-phone-invitation";
import { APIError, getSessionFromCtx } from "better-auth/api";
import type { phoneNumber } from "better-auth/plugins";
type GenericEndpointContext = NonNullable<
  Parameters<NonNullable<Parameters<typeof phoneNumber>[0]>["sendOTP"]>[1]
>;
import { and, eq, gt } from "drizzle-orm";
import db, { schema } from "../database";
import { hasRegisteredUsers } from "../utils/instance-bootstrap";
import {
  normalizeIranPhone,
  isPhoneIdentityEmail,
  realEmail,
} from "@kaneo/contacts";
import { isBaleConfigured } from "../bale/config";
import { limitPhoneSend, phonePurpose } from "./challenges";

export async function assertPhoneRegistrationAllowed(phone: string) {
  if (!(await hasRegisteredUsers())) return;
  if (
    process.env.DISABLE_LOGIN_FORM === "true" ||
    process.env.DISABLE_PASSWORD_REGISTRATION === "true"
  )
    throw new APIError("FORBIDDEN", {
      message: "Local registration is disabled",
    });
  if (process.env.DISABLE_REGISTRATION !== "true") return;
  const invitation = await db.query.invitationTable.findFirst({
    where: and(
      eq(schema.invitationTable.phoneNumber, phone),
      eq(schema.invitationTable.status, "pending"),
      gt(schema.invitationTable.expiresAt, new Date()),
    ),
  });
  if (!invitation)
    throw new APIError("FORBIDDEN", {
      message: "A valid invitation for this phone number is required",
    });
}

export async function guardPhoneAuth(ctx: GenericEndpointContext) {
  if (
    typeof ctx.body?.email === "string" &&
    isPhoneIdentityEmail(ctx.body.email) &&
    !ctx.path.startsWith("/organization/")
  )
    throw new APIError("BAD_REQUEST", {
      message: "A real email address is required",
    });
  if (
    ctx.path === "/sign-in/phone-number" ||
    ctx.path === "/phone-number/request-password-reset" ||
    ctx.path === "/phone-number/reset-password"
  )
    throw new APIError("FORBIDDEN", {
      message: "Phone accounts use one-time codes",
    });
  if (
    ctx.path === "/phone-number/send-otp" ||
    ctx.path === "/phone-number/verify"
  ) {
    if (!isBaleConfigured())
      throw new APIError("FORBIDDEN", { message: "Bale is not configured" });
    const phone =
      typeof ctx.body?.phoneNumber === "string"
        ? normalizeIranPhone(ctx.body.phoneNumber)
        : null;
    if (!phone)
      throw new APIError("BAD_REQUEST", {
        message: "Enter a valid Iranian mobile number",
      });
    ctx.body.phoneNumber = phone;
    const { purpose, userId } = await phonePurpose(ctx);
    const user = await db.query.userTable.findFirst({
      where: eq(schema.userTable.phoneNumber, phone),
    });
    if (user?.banned)
      throw new APIError("FORBIDDEN", { message: "Account unavailable" });
    if (purpose === "change-phone" && user && user.id !== userId)
      throw new APIError("CONFLICT", {
        message: "This phone number belongs to another account",
      });
    if (!user && purpose === "sign-in") {
      // Eligibility is checked again after OTP consumption, before account creation.
      if (ctx.path === "/phone-number/verify") {
        await assertPhoneRegistrationAllowed(phone);
        if (
          typeof ctx.body.name !== "string" ||
          !ctx.body.name.trim() ||
          ctx.body.name.length > 100
        )
          throw new APIError("BAD_REQUEST", {
            message: "Your name is required",
          });
      }
    }
    if (
      ctx.path === "/phone-number/verify" &&
      !/^\d{6}$/.test(ctx.body.code ?? "")
    )
      throw new APIError("BAD_REQUEST", { message: "Enter a six-digit code" });
    if (ctx.path === "/phone-number/send-otp") {
      await limitPhoneSend(
        phone,
        ctx.headers?.get("x-kaneo-client-ip") ?? "unknown",
      );
      const original = ctx.context.internalAdapter;
      ctx.context.internalAdapter = {
        ...original,
        createVerificationValue: async (data) => {
          if (data.identifier !== phone)
            return original.createVerificationValue(data);
          return {
            ...data,
            id: "phone-challenge",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      };
    }
  }
  if (ctx.path === "/update-user" && ctx.body?.phoneNumber === null) {
    const session = await getSessionFromCtx(ctx);
    const user = session
      ? await db.query.userTable.findFirst({
          where: eq(schema.userTable.id, session.user.id),
        })
      : null;
    if (!user?.emailVerified || !realEmail(user.email))
      throw new APIError("BAD_REQUEST", {
        message: "Keep at least one verified sign-in method",
      });
  }
  if (
    ctx.path === "/admin/update-user" &&
    isPhoneIdentityEmail(ctx.body?.data?.email)
  )
    throw new APIError("BAD_REQUEST", {
      message: "A real email address is required",
    });
  if (
    ctx.path === "/admin/update-user" &&
    ("phoneNumber" in (ctx.body?.data ?? {}) ||
      "phoneNumberVerified" in (ctx.body?.data ?? {}))
  )
    throw new APIError("BAD_REQUEST", {
      message: "Use the phone recovery endpoint",
    });
  if (
    ctx.path === "/organization/invite-member" &&
    isPhoneIdentityEmail(ctx.body?.email) &&
    !ctx.body?.phoneNumber
  )
    throw new APIError("BAD_REQUEST", {
      message: "A phone invitation requires its recipient number",
    });
  if (ctx.path === "/organization/invite-member" && ctx.body?.phoneNumber) {
    const phone = normalizeIranPhone(ctx.body.phoneNumber);
    if (!phone || !isPhoneIdentityEmail(ctx.body.email))
      throw new APIError("BAD_REQUEST", { message: "Use a phone invitation" });
    ctx.body.phoneNumber = phone;
  }
  if (
    [
      "/organization/accept-invitation",
      "/organization/reject-invitation",
      "/organization/get-invitation",
    ].includes(ctx.path)
  ) {
    const id = ctx.body?.invitationId ?? ctx.query?.id;
    if (typeof id !== "string") return;
    const invitation = await db.query.invitationTable.findFirst({
      where: eq(schema.invitationTable.id, id),
    });
    if (!invitation?.phoneNumber) return;
    const session = await getSessionFromCtx(ctx);
    const user = session
      ? await db.query.userTable.findFirst({
          where: eq(schema.userTable.id, session.user.id),
        })
      : null;
    if (
      !user?.phoneNumberVerified ||
      user.phoneNumber !== invitation.phoneNumber
    )
      throw new APIError("FORBIDDEN", {
        message:
          "Verify the invited phone number before answering this invitation",
      });
    if (ctx.path !== "/organization/get-invitation") {
      return ctx.json(
        await answerPhoneInvitation(
          id,
          user.id,
          session!.session.id,
          ctx.path === "/organization/accept-invitation",
        ),
      );
    }
    return ctx.json({
      ...invitation,
      email: null,
      organizationId: invitation.workspaceId,
    });
  }
}
