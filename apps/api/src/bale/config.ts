import { resolveFileSecret } from "../utils/file-secret";

export function getBaleConfig() {
  const apiKey = resolveFileSecret("BALE_SAFIR_API_ACCESS_KEY")?.trim();
  const botId = process.env.BALE_SAFIR_BOT_ID?.trim();
  return apiKey &&
    botId &&
    /^[1-9]\d*$/.test(botId) &&
    Number.isSafeInteger(Number(botId))
    ? { apiKey, botId: Number(botId) }
    : null;
}

export function isBaleConfigured() {
  return getBaleConfig() !== null;
}
