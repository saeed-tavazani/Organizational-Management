import type { BetterAuthOptions } from "better-auth";
import type { DBAdapter } from "better-auth/adapters";
import {
  type DrizzleAdapterConfig,
  drizzleAdapter,
} from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { count, sql, eq } from "drizzle-orm";
import { realEmail } from "@kaneo/contacts";
import { isContactConflict } from "../phone/is-contact-conflict";
import {
  hasInstanceAdminRole,
  instanceAdminRoleSql,
} from "../utils/instance-admin-role";
import db, { schema } from ".";

export function authDatabaseAdapter(config: DrizzleAdapterConfig) {
  return (options: BetterAuthOptions): DBAdapter => {
    const adapter = drizzleAdapter(db, config)(options);
    return {
      ...adapter,
      async create<T extends Record<string, any>, R = T>(data: {
        model: string;
        data: Omit<T, "id">;
        select?: string[];
        forceAllowId?: boolean;
      }): Promise<R> {
        if (data.model === "session" && typeof data.data.userId === "string") {
          const [user] = await db
            .select({
              phoneNumberVerified: schema.userTable.phoneNumberVerified,
            })
            .from(schema.userTable)
            .where(eq(schema.userTable.id, data.data.userId));
          if (user && !user.phoneNumberVerified) {
            const [recovery] = await db
              .select({ id: schema.phoneRecoveryAuditTable.id })
              .from(schema.phoneRecoveryAuditTable)
              .where(
                eq(schema.phoneRecoveryAuditTable.userId, data.data.userId),
              )
              .limit(1);
            if (recovery)
              throw new APIError("FORBIDDEN", {
                message: "Verify the recovered phone before signing in",
              });
          }
        }
        try {
          return await adapter.create<T, R>(data);
        } catch (error) {
          if (
            data.model === "user" &&
            data.data.phoneNumber &&
            isContactConflict(error)
          )
            throw new APIError("CONFLICT", {
              message: "Phone number already belongs to an account",
            });
          throw error;
        }
      },
      async update<T>(data: Parameters<DBAdapter["update"]>[0]) {
        if (
          data.model === "user" &&
          typeof data.update.phoneNumber === "string"
        ) {
          try {
            return await adapter.update<T>(data);
          } catch (error) {
            if (isContactConflict(error))
              throw new APIError("CONFLICT", {
                message: "Phone number already belongs to an account",
              });
            throw error;
          }
        }
        if (data.model === "user" && data.update.phoneNumber === null) {
          return db.transaction(async (tx) => {
            const transactionAdapter = drizzleAdapter(tx, config)(options);
            const found = await transactionAdapter.findOne<{ id: string }>({
              model: "user",
              where: data.where,
            });
            const [user] = found
              ? await tx
                  .select()
                  .from(schema.userTable)
                  .where(eq(schema.userTable.id, found.id))
                  .for("update")
              : [];
            if (!user?.emailVerified || !realEmail(user.email)) {
              throw new APIError("BAD_REQUEST", {
                message: "Keep at least one verified sign-in method",
              });
            }
            return transactionAdapter.update<T>(data);
          });
        }
        if (
          data.model !== "user" ||
          !Object.hasOwn(data.update, "role") ||
          hasInstanceAdminRole(data.update.role)
        ) {
          return adapter.update<T>(data);
        }

        return db.transaction(async (tx) => {
          // Serialize role removals across API instances, keeping the count
          // and write in the same transaction so cross-demotions cannot race.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(2026, 1732)`);
          const transactionAdapter = drizzleAdapter(tx, config)(options);
          const user = await transactionAdapter.findOne<{ role?: string }>({
            model: data.model,
            where: data.where,
          });

          if (hasInstanceAdminRole(user?.role)) {
            const [admins] = await tx
              .select({ value: count() })
              .from(schema.userTable)
              .where(instanceAdminRoleSql(schema.userTable.role));
            if ((admins?.value ?? 0) <= 1) {
              throw new APIError("BAD_REQUEST", {
                code: "CANNOT_REMOVE_LAST_ADMIN",
                message: "The instance must have at least one administrator.",
              });
            }
          }

          return transactionAdapter.update<T>(data);
        });
      },
    };
  };
}
