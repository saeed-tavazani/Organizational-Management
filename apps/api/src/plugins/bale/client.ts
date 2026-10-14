import {
  OutboundRequestError,
  sendOutboundRequest,
} from "../../utils/outbound-request";

export async function postToBale(
  botToken: string,
  message: { chat_id: string; text: string },
): Promise<void> {
  const result = await sendOutboundRequest(
    `https://tapi.bale.ai/bot${botToken}/sendMessage`,
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    },
    { readJson: true, timeoutMs: 10_000 },
  );
  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    result.ok !== true
  ) {
    throw new OutboundRequestError("response");
  }
}
