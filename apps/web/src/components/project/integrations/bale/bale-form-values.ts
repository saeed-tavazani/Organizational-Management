import { z } from "zod/v4";
import {
  type ChatEvents,
  toChatEvents,
} from "@/components/project/integrations/chat-webhook/chat-events";
import type { BaleIntegration } from "@/fetchers/bale-integration/get-bale-integration";

export type BaleFormValues = {
  botToken: string;
  chatId: string;
  chatLabel: string;
  events: ChatEvents;
};

export const baleFormSchema = z.object({
  botToken: z.string(),
  chatId: z.string(),
  chatLabel: z.string(),
  events: z.object({
    taskCreated: z.boolean(),
    taskStatusChanged: z.boolean(),
    taskPriorityChanged: z.boolean(),
    taskTitleChanged: z.boolean(),
    taskDescriptionChanged: z.boolean(),
    taskCommentCreated: z.boolean(),
  }),
});

export function toBaleFormValues(
  integration: BaleIntegration | undefined,
): BaleFormValues {
  return {
    botToken: "",
    chatId: integration?.chatId ?? "",
    chatLabel: integration?.chatLabel ?? "",
    events: toChatEvents(integration?.events),
  };
}
