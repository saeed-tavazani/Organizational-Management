import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { postToBale } from "./client";

vi.mock("../../utils/sensitive-outbound", () => ({
  withoutOutboundTelemetry: (fn: () => unknown) => fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const token = `123456789:${"a".repeat(40)}`;
const message = { chat_id: "@channel", text: "تسک جدید" };

describe("Bale outbound client", () => {
  it("posts only supported fields to the fixed Bale endpoint", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, result: {} }));
    vi.stubGlobal("fetch", fetch);
    await postToBale(token, message);
    expect(fetch).toHaveBeenCalledWith(
      `https://tapi.bale.ai/bot${token}/sendMessage`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(message),
        redirect: "error",
      }),
    );
  });
  it.each([
    Response.json({ ok: false }),
    Response.json({ result: {} }),
    new Response("not json"),
    new Response("secret", { status: 429 }),
  ])(
    "rejects an unsuccessful response without its sensitive body",
    async (response) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(postToBale(token, message)).rejects.toThrow(
        "Outbound request failed",
      );
    },
  );
  it("times out after ten seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    const result = postToBale(token, message);
    const assertion = expect(result).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });
  it("redacts network errors containing the token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(token)));
    await expect(postToBale(token, message)).rejects.toThrow(
      "Outbound request failed: network",
    );
  });
});
