import type { MiddlewareHandler } from "hono";
import { isPhoneIdentityEmail } from "@kaneo/contacts";

export function hideInternalEmails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hideInternalEmails);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        ["email", "emailAddress", "inviterEmail"].includes(key) &&
        typeof item === "string" &&
        isPhoneIdentityEmail(item)
          ? null
          : hideInternalEmails(item),
      ]),
    );
  return value;
}

/** Auth is third-party serialized; domain APIs project their contact fields. */
export const publicAuthIdentity: MiddlewareHandler = async (c, next) => {
  await next();
  if (!c.res.headers.get("Content-Type")?.includes("application/json")) return;
  const text = await c.res.clone().text();
  if (!text.includes("@phone.montask.invalid")) return;
  const headers = new Headers(c.res.headers);
  headers.delete("Content-Length");
  c.res = new Response(JSON.stringify(hideInternalEmails(JSON.parse(text))), {
    status: c.res.status,
    headers,
  });
};
