import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { BaleDeliveryError, sendSafirMessage } from "./safir";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configured() {
  vi.stubEnv("BALE_SAFIR_API_ACCESS_KEY", "test-key");
  vi.stubEnv("BALE_SAFIR_BOT_ID", "123");
}
describe("Safir adapter", () => {
  it("sends OTP with a stable request id and provider-normalized number", async () => {
    configured();
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message_id: "sent" })));
    vi.stubGlobal("fetch", request);
    await expect(
      sendSafirMessage("+989123456789", "stable-id", { otp: "123456" }),
    ).resolves.toBe("sent");
    expect(request.mock.calls[0]![0]).toBe(
      "https://safir.bale.ai/api/v3/send_message",
    );
    expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({
      request_id: "stable-id",
      bot_id: 123,
      phone_number: "989123456789",
      message_data: { otp_message: { otp: "123456" } },
    });
  });
  it("supports invitation and notification link buttons", async () => {
    configured();
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message_id: "sent" })));
    vi.stubGlobal("fetch", request);
    await sendSafirMessage("+989123456789", "stable-id", {
      text: "Invite",
      url: "https://example.com/invite",
    });
    expect(
      JSON.parse(request.mock.calls[0]![1].body).message_data.message
        .reply_markup.inline_keyboard[0][0].url,
    ).toBe("https://example.com/invite");
  });
  it.each([
    [2, true],
    [3, true],
    [17, false],
    [20, false],
    [21, false],
  ])("classifies provider error %s", async (code, retryable) => {
    configured();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error_data: { code, description: "sensitive provider content" },
          }),
        ),
      ),
    );
    const failure = await sendSafirMessage("+989123456789", "id", {
      text: "Text",
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(BaleDeliveryError);
    expect(failure).toMatchObject({ retryable });
    expect(String(failure)).not.toContain("sensitive");
  });
  it("treats a network timeout as retryable", async () => {
    configured();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("secret in URL")),
    );
    await expect(
      sendSafirMessage("+989123456789", "id", { text: "Text" }),
    ).rejects.toMatchObject({ code: "NETWORK", retryable: true });
  });
});
