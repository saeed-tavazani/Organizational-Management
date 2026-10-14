import { createId } from "@paralleldrive/cuid2";
import { integer, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const phoneChallengeTable = pgTable("phone_challenge", {
  id: text("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  purpose: text("purpose").notNull(),
  userId: text("user_id"),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const phoneRateLimitTable = pgTable("phone_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").default(1).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const phoneRecoveryAuditTable = pgTable("phone_recovery_audit", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  administratorId: text("administrator_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const baleDeliveryTable = pgTable(
  "bale_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id"),
    phoneNumber: text("phone_number").notNull(),
    kind: text("kind").notNull(),
    resourceId: text("resource_id"),
    payload: text("payload").notNull(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    errorCode: text("error_code"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bale_delivery_pending_idx").on(table.status, table.nextAttemptAt),
    index("bale_delivery_user_idx").on(table.userId),
  ],
);
