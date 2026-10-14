import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { auth } from "../../auth";
import db, { schema } from "../../database";
import { hashPhoneCode } from "../../bale/crypto";
import { isBaleConfigured } from "../../bale/config";
import { normalizeIranPhone } from "@kaneo/contacts";

export async function createPhoneInvitation(
  input: {
    workspaceId: string;
    phoneNumber: string;
    role: "member" | "admin" | "owner";
    resend?: boolean;
    projectAccess?: "all" | "selected";
    projectIds?: string[];
  },
  headers: Headers,
) {
  const phoneNumber = normalizeIranPhone(input.phoneNumber);
  if (!phoneNumber)
    throw new HTTPException(400, {
      message: "Enter a valid Iranian mobile number",
    });
  if (!isBaleConfigured())
    throw new HTTPException(400, { message: "Bale is not configured" });
  const existing = await db.query.invitationTable.findFirst({
    where: and(
      eq(schema.invitationTable.workspaceId, input.workspaceId),
      eq(schema.invitationTable.phoneNumber, phoneNumber),
      eq(schema.invitationTable.status, "pending"),
    ),
  });
  const result = await auth.api.createInvitation({
    headers,
    body: {
      email:
        existing?.email ??
        `${hashPhoneCode(`invite:${phoneNumber}`)}@phone.montask.invalid`,
      phoneNumber,
      organizationId: input.workspaceId,
      role: input.role,
      resend: input.resend,
      projectAccess: input.projectAccess,
      projectIds: input.projectIds,
    },
  });
  return {
    id: result.id,
    email: null,
    phoneNumber,
    status: result.status,
    role: result.role,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
  };
}
