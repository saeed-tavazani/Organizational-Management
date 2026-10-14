import type { integrationTable } from "../database/schema";
import { defaultBaleEvents } from "../plugins/bale/config";
import { parseBaleConfig } from "./config";

export function toBaleResponse(
  integration: typeof integrationTable.$inferSelect,
) {
  const config = parseBaleConfig(integration.config);
  return {
    id: integration.id,
    projectId: integration.projectId,
    chatId: config.chatId,
    chatLabel: config.chatLabel ?? null,
    botTokenConfigured: true,
    maskedBotToken: `${config.botToken.split(":", 1)[0]}:••••`,
    events: { ...defaultBaleEvents, ...config.events },
    isActive: integration.isActive,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}
