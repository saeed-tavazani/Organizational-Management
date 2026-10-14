import { eq, desc } from "drizzle-orm";
import db, { schema } from "../database";
import { apiRouter, createRoute, jsonResponse, z } from "../openapi";
import { requireUserSession } from "../utils/require-user-session";
import {
  sendContactEmailCode,
  verifyContactEmail,
  removeContactEmail,
} from "./contact-service";

const success = jsonResponse(
  "Operation completed",
  z.object({ success: z.boolean() }),
);
const email = createRoute({
  method: "post",
  path: "/contact/email",
  operationId: "sendContactEmailCode",
  summary: "Send account email verification code",
  tags: ["User"],
  middleware: [requireUserSession] as const,
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: z.object({ email: z.email() }) },
      },
    },
  },
  responses: { 200: success },
});
const verify = createRoute({
  method: "post",
  path: "/contact/email/verify",
  operationId: "verifyContactEmail",
  summary: "Attach a verified email to the current account",
  tags: ["User"],
  middleware: [requireUserSession] as const,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ code: z.string().regex(/^\d{6}$/) }),
        },
      },
    },
  },
  responses: { 200: success },
});
const remove = createRoute({
  method: "delete",
  path: "/contact/email",
  operationId: "removeContactEmail",
  summary: "Remove email while keeping a verified phone",
  tags: ["User"],
  middleware: [requireUserSession] as const,
  responses: { 200: success },
});
const deliveries = createRoute({
  method: "get",
  path: "/bale-deliveries",
  operationId: "getBaleDeliveries",
  summary: "Recent Bale delivery status for the current user",
  tags: ["User"],
  middleware: [requireUserSession] as const,
  responses: {
    200: jsonResponse(
      "Recent delivery statuses",
      z.array(
        z.object({
          id: z.string(),
          kind: z.string(),
          status: z.string(),
          attempts: z.number(),
          errorCode: z.string().nullable(),
          createdAt: z.string(),
        }),
      ),
    ),
  },
});

export const contactRoutes = apiRouter()
  .openapi(email, async (c) => {
    await sendContactEmailCode(c.get("userId"), c.req.valid("json").email);
    return c.json({ success: true }, 200);
  })
  .openapi(verify, async (c) => {
    await verifyContactEmail(c.get("userId"), c.req.valid("json").code);
    return c.json({ success: true }, 200);
  })
  .openapi(remove, async (c) =>
    c.json(await removeContactEmail(c.get("userId")), 200),
  )
  .openapi(deliveries, async (c) => {
    const rows = await db
      .select({
        id: schema.baleDeliveryTable.id,
        kind: schema.baleDeliveryTable.kind,
        status: schema.baleDeliveryTable.status,
        attempts: schema.baleDeliveryTable.attempts,
        errorCode: schema.baleDeliveryTable.errorCode,
        createdAt: schema.baleDeliveryTable.createdAt,
      })
      .from(schema.baleDeliveryTable)
      .where(eq(schema.baleDeliveryTable.userId, c.get("userId")))
      .orderBy(desc(schema.baleDeliveryTable.createdAt))
      .limit(25);
    return c.json(
      rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      200,
    );
  });
