import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AttendanceGrants, AttendanceRole } from "@kaneo/permissions";
import type {
  AttendanceRequestPayload,
  AttendancePolicy,
} from "../attendance/types";
import { userTable } from "./schema";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const id = () => text("id").primaryKey().$defaultFn(createId);
const userId = () =>
  text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" });

export const attendanceSettingsTable = pgTable(
  "attendance_settings",
  {
    id: id(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    policy: jsonb("policy").$type<AttendancePolicy>().notNull(),
    grants: jsonb("grants").$type<AttendanceGrants>().notNull(),
    changedBy: text("changed_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("attendance_settings_effective_idx").on(t.effectiveAt)],
);

export const attendanceEmployeeTable = pgTable("attendance_employee", {
  userId: userId().primaryKey(),
  role: text("role").$type<AttendanceRole>().notNull().default("employee"),
  createdAt: createdAt(),
});

export const attendanceBankTable = pgTable("attendance_bank", {
  userId: userId().primaryKey(),
  holder: text("holder").notNull(),
  iban: text("iban").notNull(),
  bank: text("bank").notNull().default(""),
  card: text("card").notNull().default(""),
  account: text("account").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attendanceRateTable = pgTable(
  "attendance_rate",
  {
    id: id(),
    userId: userId(),
    amount: integer("amount").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    approvedBy: text("approved_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("attendance_rate_user_effective_idx").on(t.userId, t.effectiveAt),
  ],
);

export const attendanceEntryTable = pgTable(
  "attendance_entry",
  {
    id: id(),
    userId: userId(),
    projectId: text("project_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    projectName: text("project_name").notNull(),
    workspaceName: text("workspace_name").notNull(),
    description: text("description").notNull().default(""),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    hourlyRate: integer("hourly_rate"),
    policy: jsonb("policy").$type<AttendancePolicy>().notNull(),
    reviewStatus: text("review_status")
      .$type<"valid" | "pending" | "approved">()
      .notNull()
      .default("valid"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("attendance_entry_user_start_idx").on(t.userId, t.startTime),
    uniqueIndex("attendance_entry_one_running_idx")
      .on(t.userId)
      .where(sql`${t.endTime} IS NULL AND ${t.deletedAt} IS NULL`),
  ],
);

export const attendanceRequestTable = pgTable(
  "attendance_request",
  {
    id: id(),
    userId: userId(),
    payload: jsonb("payload").$type<AttendanceRequestPayload>().notNull(),
    status: text("status")
      .$type<"pending" | "approved" | "rejected" | "cancelled">()
      .notNull()
      .default("pending"),
    reason: text("reason").notNull().default(""),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("attendance_request_user_status_idx").on(t.userId, t.status)],
);

export const attendanceAuditTable = pgTable(
  "attendance_audit",
  {
    id: id(),
    userId: userId(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    resourceId: text("resource_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: createdAt(),
  },
  (t) => [index("attendance_audit_user_created_idx").on(t.userId, t.createdAt)],
);
