import { attendancePermissions, attendanceRoles } from "@kaneo/permissions";
import {
  z,
  responseTimestamp,
  nullableResponseTimestamp,
  pagingNumber,
} from "../openapi";

export const policySchema = z.object({
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
  timeZone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid time zone"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: z.number().int().min(0).max(1440),
  penaltyPerMinute: z.number().int().min(0).max(10000000),
  maxTimerHours: z.number().min(1).max(168),
  enabled: z.boolean(),
});
export const grantsSchema = z.object({
  employee: z.array(z.enum(attendancePermissions)).max(8),
  hr: z.array(z.enum(attendancePermissions)).max(8),
  finance: z.array(z.enum(attendancePermissions)).max(8),
});
export const settingsBody = z.object({
  policy: policySchema,
  grants: grantsSchema.refine(
    (grants) =>
      Object.values(grants).every(
        (permissions) =>
          !permissions.includes("roles") && !permissions.includes("settings"),
      ),
    "Company settings and role management are reserved for instance administrators",
  ),
});
export const settingsResponse = settingsBody.extend({
  configured: z.boolean(),
});
const timestamp = z.iso.datetime({ offset: true });
export const requestPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("leave"),
    mode: z.enum(["hourly", "daily"]),
    startTime: timestamp,
    endTime: timestamp,
  }),
  z.object({
    kind: z.literal("rate"),
    amount: z.number().int().min(0).max(100000000),
  }),
  z.object({
    kind: z.literal("correction"),
    entryId: z.string().optional(),
    projectId: z.string().min(1),
    startTime: timestamp,
    endTime: timestamp,
    description: z.string().max(2000).default(""),
    remove: z.boolean().default(false),
  }),
  z.object({ kind: z.literal("cancel"), requestId: z.string().min(1) }),
  z.object({ kind: z.literal("review"), entryId: z.string().min(1) }),
]);
export const requestBody = z.object({
  payload: requestPayloadSchema,
  reason: z.string().trim().min(1).max(2000),
});
export const requestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  payload: requestPayloadSchema,
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  reason: z.string(),
  decidedBy: z.string().nullable(),
  decidedAt: nullableResponseTimestamp,
  createdAt: responseTimestamp,
});
export const entrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string(),
  workspaceId: z.string(),
  projectName: z.string(),
  workspaceName: z.string(),
  description: z.string(),
  startTime: responseTimestamp,
  endTime: nullableResponseTimestamp,
  hourlyRate: z.number().nullable(),
  policy: policySchema,
  reviewStatus: z.enum(["valid", "pending", "approved"]),
  needsReview: z.boolean(),
  createdAt: responseTimestamp,
});
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
});
export const bankSchema = z.object({
  holder: z.string().trim().min(1).max(150),
  iban: z
    .string()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .pipe(z.string().regex(/^IR\d{24}$/))
    .refine((v) => {
      const digits = `${v.slice(4)}1827${v.slice(2, 4)}`;
      let remainder = 0;
      for (const digit of digits)
        remainder = (remainder * 10 + Number(digit)) % 97;
      return remainder === 1;
    }, "Invalid IBAN checksum"),
  bank: z.string().trim().max(100).default(""),
  card: z
    .string()
    .regex(/^(\d{16})?$/)
    .default(""),
  account: z
    .string()
    .regex(/^\d{0,30}$/)
    .default(""),
});
export const profileSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", ...attendanceRoles]),
  permissions: z.array(z.enum(attendancePermissions)),
  rate: z.number().nullable(),
  bank: bankSchema.nullable(),
});
export const employeeSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", ...attendanceRoles]),
  rate: z.number().nullable(),
});
export const listQuery = z.object({
  userId: z.string().optional(),
  offset: pagingNumber(0, 1000000, 0),
  limit: pagingNumber(1, 100, 30),
});
export const reportQuery = z
  .object({
    scope: z.enum(["me", "all"]).optional(),
    from: timestamp,
    to: timestamp,
    userId: z.string().optional(),
    projectId: z.string().optional(),
    workspaceId: z.string().optional(),
  })
  .refine(
    (v) =>
      Date.parse(v.to) > Date.parse(v.from) &&
      Date.parse(v.to) - Date.parse(v.from) <= 367 * 86400000,
    "Report range must be between zero and 367 days",
  );
export const reportRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  seconds: z.number(),
  pendingSeconds: z.number(),
  unknownRateSeconds: z.number(),
  leaveSeconds: z.number(),
  leaveDays: z.number(),
  lateMinutes: z.number(),
  gross: z.number().nullable(),
  penalty: z.number().nullable(),
  net: z.number().nullable(),
});
export const idParam = z.object({ id: z.string() });
