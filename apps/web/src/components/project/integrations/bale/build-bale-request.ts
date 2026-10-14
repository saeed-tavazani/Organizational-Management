import type { CreateBaleIntegrationRequest } from "@/fetchers/bale-integration/create-bale-integration";
import type { UpdateBaleIntegrationRequest } from "@/fetchers/bale-integration/update-bale-integration";
import type { BaleFormValues } from "./bale-form-values";

export type BaleRequest =
  | {
      kind: "invalid";
      field: "botToken" | "chatId";
      messageKey: string;
    }
  | { kind: "create"; data: CreateBaleIntegrationRequest }
  | { kind: "update"; json: UpdateBaleIntegrationRequest };

function isValidBotToken(value: string): boolean {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(value);
}

export function buildBaleRequest(
  values: BaleFormValues,
  connected: boolean,
): BaleRequest {
  const botToken = values.botToken.trim();
  const chatId = values.chatId.trim();
  const chatLabel = values.chatLabel.trim();

  if (!/^(?:-?\d+|@[A-Za-z0-9_]+)$/.test(chatId)) {
    return {
      kind: "invalid",
      field: "chatId",
      messageKey: "settings:baleIntegration.validation.chatIdRequired",
    };
  }

  if ((!connected || botToken) && !isValidBotToken(botToken)) {
    return {
      kind: "invalid",
      field: "botToken",
      messageKey: "settings:baleIntegration.validation.botTokenInvalid",
    };
  }

  if (!connected) {
    return {
      kind: "create",
      data: {
        botToken,
        chatId,
        chatLabel: chatLabel || undefined,
        events: values.events,
      },
    };
  }

  return {
    kind: "update",
    json: {
      botToken: botToken || undefined,
      chatId,
      chatLabel: chatLabel || null,
      events: values.events,
    },
  };
}
