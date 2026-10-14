import { HTTPException } from "hono/http-exception";
import type { z } from "../openapi";
import {
  baleConfigSchema,
  normalizeBaleConfig,
  type BaleConfig,
} from "../plugins/bale/config";
import type { updateBaleBody } from "./schema";

export function parseBaleConfig(config: string): BaleConfig {
  try {
    return normalizeBaleConfig(baleConfigSchema.parse(JSON.parse(config)));
  } catch {
    // Validation errors can include the input credential; never log them.
    throw new HTTPException(500, {
      message: "Stored Bale integration configuration is invalid",
    });
  }
}

export function patchBaleConfig(
  current: BaleConfig,
  body: z.infer<typeof updateBaleBody>,
): BaleConfig {
  return normalizeBaleConfig({
    botToken: body.botToken ?? current.botToken,
    chatId: body.chatId ?? current.chatId,
    chatLabel:
      body.chatLabel === undefined
        ? current.chatLabel
        : (body.chatLabel ?? undefined),
    events: { ...current.events, ...body.events },
  });
}
