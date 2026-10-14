import { apiRouter, createRoute, jsonResponse, z } from "../openapi";
import { requireUserSession } from "../utils/require-user-session";
import { requireInstanceAdmin } from "../utils/require-instance-admin";
import { recoverPhone } from "./contact-service";

const route = createRoute({
  method: "post",
  path: "/users/{userId}/recover-phone",
  operationId: "recoverUserPhone",
  summary: "Recover a user's phone; requires new-number verification",
  tags: ["Admin"],
  middleware: [requireUserSession, requireInstanceAdmin] as const,
  request: {
    params: z.object({ userId: z.string() }),
    body: {
      required: true,
      content: {
        "application/json": { schema: z.object({ phoneNumber: z.string() }) },
      },
    },
  },
  responses: {
    200: jsonResponse(
      "Recovery pending phone verification",
      z.object({ success: z.boolean() }),
    ),
  },
});
export const phoneAdminRoutes = apiRouter().openapi(route, async (c) =>
  c.json(
    await recoverPhone(
      c.req.valid("param").userId,
      c.req.valid("json").phoneNumber,
      c.get("userId"),
    ),
    200,
  ),
);
