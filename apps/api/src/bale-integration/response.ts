import { integrationEventsSchema } from "../integrations/response";
import { responseTimestamp, z } from "../openapi";

export const baleIntegrationSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    chatId: z.string(),
    chatLabel: z.string().nullable(),
    botTokenConfigured: z.boolean(),
    maskedBotToken: z.string(),
    events: integrationEventsSchema,
    isActive: z.boolean().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("BaleIntegration");
