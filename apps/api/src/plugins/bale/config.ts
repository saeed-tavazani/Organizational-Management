import { integrationEventToggles } from "../../integrations/schema";
import { z } from "../../openapi";

// Bale tokens resemble Telegram tokens, but do not share its fixed length.
export const baleBotTokenSchema = z
  .string()
  .trim()
  .regex(/^\d+:[A-Za-z0-9_-]{20,}$/, "Enter a valid Bale bot token");
export const baleChatIdSchema = z
  .string()
  .trim()
  .regex(/^(?:-?\d+|@[A-Za-z0-9_]+)$/, "Enter a chat ID or @channelusername");
export const baleConfigSchema = z.object({
  botToken: baleBotTokenSchema,
  chatId: baleChatIdSchema,
  chatLabel: z.string().trim().optional(),
  events: integrationEventToggles.optional(),
});
export type BaleConfig = z.infer<typeof baleConfigSchema>;
export type BaleEventKey = keyof NonNullable<BaleConfig["events"]>;
export const defaultBaleEvents: Record<BaleEventKey, boolean> = {
  taskCreated: true,
  taskStatusChanged: true,
  taskPriorityChanged: false,
  taskTitleChanged: false,
  taskDescriptionChanged: false,
  taskCommentCreated: true,
};

export function normalizeBaleConfig(config: BaleConfig): BaleConfig {
  return {
    botToken: config.botToken.trim(),
    chatId: config.chatId.trim(),
    chatLabel: config.chatLabel?.trim() || undefined,
    events: { ...defaultBaleEvents, ...config.events },
  };
}

export function validateBaleConfig(config: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const result = baleConfigSchema.safeParse(config);
  return result.success
    ? { valid: true }
    : {
        valid: false,
        errors: result.error.issues.map((issue) => issue.message),
      };
}
