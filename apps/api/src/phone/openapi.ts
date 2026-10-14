import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "../openapi";

export function registerPhoneAuthRoutes(
  registry: OpenAPIHono["openAPIRegistry"],
) {
  const phoneNumber = z.string().openapi({
    description:
      "Iranian mobile number: 09…, 989… or +989…. Persian and Arabic digits are accepted.",
  });
  registry.registerPath({
    method: "post",
    path: "/auth/phone-number/send-otp",
    operationId: "sendPhoneNumberOtp",
    tags: ["Authentication"],
    summary: "Send a six-digit code through Bale",
    security: [],
    request: {
      headers: z.object({
        "x-phone-purpose": z
          .enum(["sign-in", "change-phone"])
          .optional()
          .openapi({
            description: "change-phone requires an authenticated user session.",
          }),
      }),
      body: {
        required: true,
        content: { "application/json": { schema: z.object({ phoneNumber }) } },
      },
    },
    responses: {
      200: {
        description: "Code queued for delivery",
        content: {
          "application/json": { schema: z.object({ message: z.string() }) },
        },
      },
      400: { description: "Invalid mobile number" },
      403: { description: "Bale or local sign-in disabled" },
      429: { description: "Wait before sending another code" },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/auth/phone-number/verify",
    operationId: "verifyPhoneNumberOtp",
    tags: ["Authentication"],
    summary: "Sign in or verify a new phone with a purpose-bound Bale code",
    security: [],
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: z.object({
              phoneNumber,
              code: z.string().regex(/^\d{6}$/),
              name: z.string().max(100).optional().openapi({
                description: "Required when creating a new account.",
              }),
              updatePhoneNumber: z.boolean().optional().openapi({
                description:
                  "Requires a user session and a change-phone challenge.",
              }),
              disableSession: z.boolean().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Verified; session created unless disabled",
        content: {
          "application/json": {
            schema: z.object({
              status: z.boolean(),
              token: z.string().nullable(),
              user: z
                .object({
                  id: z.string(),
                  name: z.string(),
                  email: z.string().nullable(),
                  phoneNumber: z.string(),
                  phoneNumberVerified: z.boolean(),
                })
                .nullable(),
            }),
          },
        },
      },
      400: {
        description: "Invalid, expired, already-used code or missing name",
      },
      403: { description: "Registration or account unavailable" },
      409: { description: "Number already belongs to another account" },
    },
  });
}
