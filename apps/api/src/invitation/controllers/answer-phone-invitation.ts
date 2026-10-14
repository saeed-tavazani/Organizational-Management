import { APIError } from "better-auth/api";
import { and, count, eq, sql } from "drizzle-orm";
import db, { schema } from "../../database";
import { replaceMemberProjectAccess } from "../../project-access/replace-member-project-access";
import { isOwnerRole } from "../../project-access/is-owner-role";
import { handleMemberAdded } from "../../workspace-members/handle-member-added";
import { initializePhoneNotifications } from "../../phone/notification-defaults";

export async function answerPhoneInvitation(
  id: string,
  userId: string,
  sessionId: string,
  accept: boolean,
) {
  const result = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(schema.invitationTable)
      .where(eq(schema.invitationTable.id, id))
      .for("update");
    if (
      !invite?.phoneNumber ||
      invite.status !== "pending" ||
      invite.expiresAt <= new Date()
    )
      throw new APIError("BAD_REQUEST", {
        message: "Invitation is no longer usable",
      });
    const [user] = await tx
      .select()
      .from(schema.userTable)
      .where(eq(schema.userTable.id, userId))
      .for("update");
    if (
      !user?.phoneNumberVerified ||
      user.phoneNumber !== invite.phoneNumber ||
      user.banned
    )
      throw new APIError("FORBIDDEN", {
        message: "Verify the invited phone number",
      });
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`workspace-member:${invite.workspaceId}`}))`,
    );
    let member = null;
    if (accept) {
      const [existing] = await tx
        .select()
        .from(schema.workspaceUserTable)
        .where(
          and(
            eq(schema.workspaceUserTable.workspaceId, invite.workspaceId),
            eq(schema.workspaceUserTable.userId, userId),
          ),
        );
      if (existing) member = existing;
      else {
        const [total] = await tx
          .select({ value: count() })
          .from(schema.workspaceUserTable)
          .where(eq(schema.workspaceUserTable.workspaceId, invite.workspaceId));
        if ((total?.value ?? 0) >= 100)
          throw new APIError("FORBIDDEN", {
            message: "Workspace membership limit reached",
          });
        const [created] = await tx
          .insert(schema.workspaceUserTable)
          .values({
            workspaceId: invite.workspaceId,
            userId,
            role: invite.role ?? "member",
            joinedAt: new Date(),
          })
          .returning();
        member = created ?? null;
        await replaceMemberProjectAccess(tx, {
          workspaceId: invite.workspaceId,
          userId,
          projectAccess:
            invite.projectAccess === "selected" && !isOwnerRole(invite.role)
              ? "selected"
              : "all",
          projectIds: invite.projectIds,
        });
      }
      await tx
        .update(schema.sessionTable)
        .set({ activeOrganizationId: invite.workspaceId })
        .where(
          and(
            eq(schema.sessionTable.id, sessionId),
            eq(schema.sessionTable.userId, userId),
          ),
        );
    }
    const status = accept ? "accepted" : "rejected";
    await tx
      .update(schema.invitationTable)
      .set({ status })
      .where(eq(schema.invitationTable.id, id));
    return {
      invitation: {
        ...invite,
        email: null,
        organizationId: invite.workspaceId,
        status,
      },
      member: member
        ? {
            ...member,
            organizationId: member.workspaceId,
            createdAt: member.joinedAt,
          }
        : null,
    };
  });
  if (accept) {
    await initializePhoneNotifications(userId, result.invitation.workspaceId);
    await handleMemberAdded(result.invitation.workspaceId, userId);
  }
  return result;
}
