import type { Context, Next } from "hono";
import {
  apiRouter,
  createRoute,
  jsonResponse,
  responseTimestamp,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { requireUserSession } from "../utils/require-user-session";
import { createPhoneInvitation } from "./controllers/create-phone-invitation";

async function workspaceContext(c: Context, next: Next) {
  const body = await c.req.json();
  c.set(
    "workspaceId",
    typeof body?.workspaceId === "string" ? body.workspaceId : "",
  );
  return next();
}
const route = createRoute({
  method: "post",
  path: "/phone",
  operationId: "createPhoneInvitation",
  tags: ["Invitations"],
  summary: "Invite an Iranian phone number through Bale",
  middleware: [
    requireUserSession,
    workspaceContext,
    requireWorkspacePermission({ invitation: ["create"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            workspaceId: z.string(),
            phoneNumber: z.string(),
            role: z.enum(["member", "admin", "owner"]),
            resend: z.boolean().optional(),
            projectAccess: z.enum(["all", "selected"]).optional(),
            projectIds: z.array(z.string()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: jsonResponse(
      "Invitation saved and queued",
      z.object({
        id: z.string(),
        email: z.null(),
        phoneNumber: z.string(),
        status: z.string(),
        role: z.string(),
        createdAt: responseTimestamp,
        expiresAt: responseTimestamp,
      }),
    ),
  },
});
export const phoneInvitationRoutes = apiRouter().openapi(route, async (c) =>
  c.json(
    await createPhoneInvitation(c.req.valid("json"), c.req.raw.headers),
    200,
  ),
);
