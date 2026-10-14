import { eq } from "drizzle-orm";
import db, { schema } from "../database";
import { isPhoneIdentityEmail } from "@kaneo/contacts";

export async function initializePhoneNotifications(
  userId: string,
  workspaceId?: string,
) {
  const user = await db.query.userTable.findFirst({
    where: eq(schema.userTable.id, userId),
  });
  if (!user?.phoneNumberVerified || !isPhoneIdentityEmail(user.email)) return;
  await db
    .insert(schema.userNotificationPreferenceTable)
    .values({ userId, baleEnabled: true })
    .onConflictDoNothing();
  if (workspaceId)
    await db
      .insert(schema.userNotificationWorkspaceRuleTable)
      .values({ userId, workspaceId, baleEnabled: true })
      .onConflictDoNothing();
  else {
    const members = await db
      .select()
      .from(schema.workspaceUserTable)
      .where(eq(schema.workspaceUserTable.userId, userId));
    for (const member of members)
      await db
        .insert(schema.userNotificationWorkspaceRuleTable)
        .values({ userId, workspaceId: member.workspaceId, baleEnabled: true })
        .onConflictDoNothing();
  }
}
