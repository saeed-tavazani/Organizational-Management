import { getBaleConfig } from "./config";

export type BaleMessage = {
  otp?: string;
  text?: string;
  url?: string;
  buttonText?: string;
};

export class BaleDeliveryError extends Error {
  constructor(
    public code: string,
    public retryable: boolean,
  ) {
    super("Bale delivery failed");
  }
}

export async function sendSafirMessage(
  phoneNumber: string,
  requestId: string,
  message: BaleMessage,
) {
  const config = getBaleConfig();
  if (!config) throw new BaleDeliveryError("NOT_CONFIGURED", false);
  let response: Response;
  try {
    response = await fetch("https://safir.bale.ai/api/v3/send_message", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "Content-Type": "application/json",
        "api-access-key": config.apiKey,
      },
      body: JSON.stringify({
        request_id: requestId,
        bot_id: config.botId,
        phone_number: phoneNumber.replace(/^\+/, ""),
        message_data: message.otp
          ? { otp_message: { otp: message.otp } }
          : {
              message: {
                text: message.text,
                ...(message.url
                  ? {
                      reply_markup: {
                        inline_keyboard: [
                          [
                            {
                              text: message.buttonText || "Montask",
                              url: message.url,
                            },
                          ],
                        ],
                      },
                    }
                  : {}),
              },
            },
      }),
    });
  } catch {
    throw new BaleDeliveryError("NETWORK", true);
  }
  if (!response.ok)
    throw new BaleDeliveryError(
      `HTTP_${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  let result: { message_id?: string; error_data?: { code?: number } };
  try {
    result = await response.json();
  } catch {
    throw new BaleDeliveryError("INVALID_RESPONSE", true);
  }
  if (result.error_data) {
    const code = result.error_data.code;
    throw new BaleDeliveryError(
      `SAFIR_${code ?? "UNKNOWN"}`,
      code === 2 || code === 3,
    );
  }
  if (!result.message_id) throw new BaleDeliveryError("INVALID_RESPONSE", true);
  return result.message_id;
}
