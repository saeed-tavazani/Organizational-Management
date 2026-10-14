import { roleHasWorkspacePermission } from "../utils/require-workspace-permission";
import { hasInstanceAdminRole } from "../utils/instance-admin-role";
import { sendNotificationEmail, isSmtpConfigured } from "@kaneo/email";
import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";
import db, { schema } from "../database";
import { canReceiveResourceNotification } from "../notification/resource-access";
import { withJobLease } from "../scheduler/leader-lock";
import { realEmail } from "@kaneo/contacts";
import { isBaleConfigured } from "./config";
import { decryptBalePayload, encryptBalePayload } from "./crypto";
import { BaleDeliveryError, type BaleMessage, sendSafirMessage } from "./safir";

type Payload = {
  message: BaleMessage;
  fallback?: { subject: string; text: string; url?: string };
  emailAlreadySent?: boolean;
};
export type BaleDeliveryInput = Payload & {
  id?: string;
  userId?: string;
  phoneNumber: string;
  kind:
    | "otp"
    | "invitation"
    | "notification"
    | "magic-link"
    | "password-reset"
    | "trial";
  resourceId?: string;
  expiresAt?: Date;
};

export async function enqueueBale(input: BaleDeliveryInput) {
  if (!isBaleConfigured()) throw new BaleDeliveryError("NOT_CONFIGURED", false);
  const [row] = await db
    .insert(schema.baleDeliveryTable)
    .values({
      id: input.id,
      userId: input.userId,
      phoneNumber: input.phoneNumber,
      kind: input.kind,
      resourceId: input.resourceId,
      payload: encryptBalePayload({
        message: input.message,
        fallback: input.fallback,
        emailAlreadySent: input.emailAlreadySent,
      }),
      expiresAt: input.expiresAt ?? new Date(Date.now() + 24 * 60 * 60_000),
    })
    .onConflictDoNothing()
    .returning({ id: schema.baleDeliveryTable.id });
  return row?.id;
}

type Delivery = typeof schema.baleDeliveryTable.$inferSelect;
async function eligible(row: Delivery) {
  if (row.expiresAt <= new Date()) return false;
  if (row.kind === "otp") {
    return Boolean(
      await db.query.phoneChallengeTable.findFirst({
        where: and(
          eq(schema.phoneChallengeTable.id, row.resourceId ?? ""),
          gt(schema.phoneChallengeTable.expiresAt, new Date()),
        ),
      }),
    );
  }
  if (row.kind === "invitation") {
    const invite = await db.query.invitationTable.findFirst({
      where: eq(schema.invitationTable.id, row.resourceId ?? ""),
    });
    if (
      !invite ||
      invite.status !== "pending" ||
      invite.phoneNumber !== row.phoneNumber ||
      invite.expiresAt <= new Date()
    )
      return false;
    const inviter = await db.query.userTable.findFirst({
      where: eq(schema.userTable.id, invite.inviterId),
    });
    if (!inviter || inviter.banned) return false;
    if (hasInstanceAdminRole(inviter.role)) return true;
    const member = await db.query.workspaceUserTable.findFirst({
      where: and(
        eq(schema.workspaceUserTable.workspaceId, invite.workspaceId),
        eq(schema.workspaceUserTable.userId, inviter.id),
      ),
    });
    return Boolean(
      member &&
      (await roleHasWorkspacePermission(invite.workspaceId, member.role, {
        invitation: ["create"],
      })),
    );
  }
  if (!row.userId) return false;
  const user = await db.query.userTable.findFirst({
    where: eq(schema.userTable.id, row.userId),
  });
  if (
    !user ||
    user.banned ||
    !user.phoneNumberVerified ||
    user.phoneNumber !== row.phoneNumber
  )
    return false;
  if (row.kind === "trial") {
    const billing = await db.query.workspaceBillingTable.findFirst({
      where: eq(schema.workspaceBillingTable.workspaceId, row.resourceId ?? ""),
    });
    const member = await db.query.workspaceUserTable.findFirst({
      where: and(
        eq(schema.workspaceUserTable.workspaceId, row.resourceId ?? ""),
        eq(schema.workspaceUserTable.userId, row.userId),
      ),
    });
    if (
      !billing ||
      billing.foundingFree ||
      billing.creemSubscriptionId ||
      !member ||
      member.role !== "owner"
    )
      return false;
  }
  if (row.kind === "notification") {
    const notification = await db.query.notificationTable.findFirst({
      where: eq(schema.notificationTable.id, row.resourceId ?? ""),
    });
    if (
      !notification ||
      !(await canReceiveResourceNotification(
        row.userId,
        notification.resourceId,
        notification.resourceType,
      ))
    )
      return false;
    const preference = await db.query.userNotificationPreferenceTable.findFirst(
      { where: eq(schema.userNotificationPreferenceTable.userId, row.userId) },
    );
    if (!preference?.baleEnabled) return false;
    let workspaceId: string | null =
      notification.resourceType === "workspace"
        ? notification.resourceId
        : null;
    let projectId: string | null = null;
    if (notification.resourceType === "task") {
      const task = await db.query.taskTable.findFirst({
        where: eq(schema.taskTable.id, notification.resourceId ?? ""),
      });
      projectId = task?.projectId ?? null;
      const project = projectId
        ? await db.query.projectTable.findFirst({
            where: eq(schema.projectTable.id, projectId),
          })
        : null;
      workspaceId = project?.workspaceId ?? null;
    }
    if (!workspaceId) return false;
    const rule = await db.query.userNotificationWorkspaceRuleTable.findFirst({
      where: and(
        eq(schema.userNotificationWorkspaceRuleTable.userId, row.userId),
        eq(schema.userNotificationWorkspaceRuleTable.workspaceId, workspaceId),
      ),
      with: { selectedProjects: true },
    });
    if (
      !rule?.isActive ||
      !rule.baleEnabled ||
      (rule.projectMode === "selected" &&
        !rule.selectedProjects.some(
          (project) => project.projectId === projectId,
        ))
    )
      return false;
  }
  return true;
}

async function fallbackEmail(
  row: Delivery,
  payload: Payload,
): Promise<boolean> {
  if (payload.emailAlreadySent || !isSmtpConfigured()) return false;
  const user =
    row.kind === "invitation"
      ? await db.query.userTable.findFirst({
          where: and(
            eq(schema.userTable.phoneNumber, row.phoneNumber),
            eq(schema.userTable.phoneNumberVerified, true),
          ),
        })
      : row.userId
        ? await db.query.userTable.findFirst({
            where: eq(schema.userTable.id, row.userId),
          })
        : undefined;
  const email = realEmail(user?.email);
  if (!user || !email || !user.emailVerified || user.banned) return false;
  if (row.kind === "otp") {
    const challenge = await db.query.phoneChallengeTable.findFirst({
      where: eq(schema.phoneChallengeTable.id, row.resourceId ?? ""),
    });
    if (
      challenge?.purpose !== "sign-in" ||
      challenge.phoneNumber !== user.phoneNumber
    )
      return false;
    // A separate email challenge logs into this account; it never verifies a phone.
    const { auth } = await import("../auth");
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  } else if (payload.fallback) {
    const result = await sendNotificationEmail(
      email,
      payload.fallback.subject,
      {
        title: payload.fallback.subject,
        message: payload.fallback.text,
        actionUrl: payload.fallback.url,
        locale: user.locale,
      },
    );
    if (!result.success) return false;
  } else return false;
  return true;
}

export async function processBaleOutbox() {
  if (!isBaleConfigured()) return;
  await withJobLease(
    "bale-outbox",
    async () => {
      const rows = await db
        .select()
        .from(schema.baleDeliveryTable)
        .where(
          and(
            inArray(schema.baleDeliveryTable.status, ["pending", "retry"]),
            lte(schema.baleDeliveryTable.nextAttemptAt, new Date()),
          ),
        )
        .orderBy(schema.baleDeliveryTable.nextAttemptAt)
        .limit(25);
      for (const row of rows) {
        try {
          if (!(await eligible(row))) {
            await db
              .update(schema.baleDeliveryTable)
              .set({ status: "expired", payload: "" })
              .where(eq(schema.baleDeliveryTable.id, row.id));
            continue;
          }
          const payload = decryptBalePayload<Payload>(row.payload);
          try {
            await sendSafirMessage(row.phoneNumber, row.id, payload.message);
            await db
              .update(schema.baleDeliveryTable)
              .set({
                status: "accepted",
                attempts: row.attempts + 1,
                payload: "",
              })
              .where(eq(schema.baleDeliveryTable.id, row.id));
          } catch (error) {
            const failure =
              error instanceof BaleDeliveryError
                ? error
                : new BaleDeliveryError("UNKNOWN", true);
            const retry = failure.retryable && row.attempts < 2;
            let status = retry ? "retry" : "failed";
            if (!retry) {
              try {
                if (
                  (await eligible(row)) &&
                  (await fallbackEmail(row, payload))
                )
                  status = "email_fallback";
              } catch {
                status = "failed";
              }
            }
            await db
              .update(schema.baleDeliveryTable)
              .set({
                status,
                attempts: row.attempts + 1,
                errorCode: failure.code,
                nextAttemptAt: new Date(
                  Date.now() + (row.attempts === 0 ? 5_000 : 30_000),
                ),
                ...(!retry ? { payload: "" } : {}),
              })
              .where(eq(schema.baleDeliveryTable.id, row.id));
          }
        } catch {
          // Provider responses and encrypted payloads must never enter logs.
          await db
            .update(schema.baleDeliveryTable)
            .set({ status: "failed", errorCode: "PAYLOAD_ERROR", payload: "" })
            .where(eq(schema.baleDeliveryTable.id, row.id));
          console.error("Bale outbox item failed", { deliveryId: row.id });
        }
      }
      await db
        .delete(schema.phoneRateLimitTable)
        .where(lte(schema.phoneRateLimitTable.expiresAt, new Date()));
      await db
        .delete(schema.phoneChallengeTable)
        .where(lte(schema.phoneChallengeTable.expiresAt, new Date()));
      await db
        .delete(schema.baleDeliveryTable)
        .where(
          and(
            lte(
              schema.baleDeliveryTable.createdAt,
              new Date(Date.now() - 30 * 24 * 60 * 60_000),
            ),
            sql`${schema.baleDeliveryTable.status} NOT IN ('pending', 'retry')`,
          ),
        );
    },
    () => undefined,
    10 * 60_000,
  );
}
