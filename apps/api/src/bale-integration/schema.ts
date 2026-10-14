import { integrationEventToggles } from "../integrations/schema";
import { z } from "../openapi";
import { baleBotTokenSchema, baleChatIdSchema } from "../plugins/bale/config";

export const createBaleBody = z.object({
  botToken: baleBotTokenSchema.openapi({
    description: "A Bale BotFather token. Never returned in responses.",
  }),
  chatId: baleChatIdSchema,
  chatLabel: z.string().optional(),
  events: integrationEventToggles.optional(),
});
export const updateBaleBody = createBaleBody.partial().extend({
  chatLabel: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
