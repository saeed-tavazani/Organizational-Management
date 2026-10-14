import { describe, expect, it } from "vite-plus/test";
import { parseBaleConfig, patchBaleConfig } from "./config";
import {
  baleConfigSchema,
  normalizeBaleConfig,
  defaultBaleEvents,
} from "../plugins/bale/config";

const botToken = `123456789:${"a".repeat(40)}`;
describe("Bale integration configuration", () => {
  it("accepts Bale tokens without Telegram's fixed length and trims string IDs", () => {
    expect(
      baleConfigSchema.parse({
        botToken: ` ${botToken} `,
        chatId: " -1234567890123456 ",
      }),
    ).toMatchObject({ botToken, chatId: "-1234567890123456" });
    expect(
      baleConfigSchema.safeParse({ botToken, chatId: "@test_channel" }).success,
    ).toBe(true);
    for (const chatId of ["", "http://example.com", "a/b", "1.5"])
      expect(baleConfigSchema.safeParse({ botToken, chatId }).success).toBe(
        false,
      );
  });
  it("merges toggles and preserves omitted token and target fields", () => {
    const current = normalizeBaleConfig({
      botToken,
      chatId: "123",
      chatLabel: "Test",
    });
    expect(current.events).toEqual(defaultBaleEvents);
    expect(
      patchBaleConfig(current, {
        events: { taskCreated: false },
        chatLabel: null,
      }),
    ).toEqual({
      ...current,
      chatLabel: undefined,
      events: { ...defaultBaleEvents, taskCreated: false },
    });
  });
  it("does not expose malformed stored credentials", () => {
    expect(() =>
      parseBaleConfig(JSON.stringify({ botToken: "secret", chatId: "123" })),
    ).toThrow("Stored Bale integration configuration is invalid");
    expect(() => parseBaleConfig("bad secret json")).toThrow(
      "Stored Bale integration configuration is invalid",
    );
  });
});
