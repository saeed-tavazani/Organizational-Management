import { describe, expect, it } from "vite-plus/test";
import { toBaleFormValues } from "./bale-form-values";
import { buildBaleRequest } from "./build-bale-request";

const token = `123456789:${"a".repeat(40)}`;
describe("Bale settings requests", () => {
  it("trims the target and credential without coercing large IDs", () => {
    const request = buildBaleRequest(
      {
        ...toBaleFormValues(null),
        botToken: ` ${token} `,
        chatId: " -1234567890123456 ",
        chatLabel: " Label ",
      },
      false,
    );
    expect(request).toMatchObject({
      kind: "create",
      data: {
        botToken: token,
        chatId: "-1234567890123456",
        chatLabel: "Label",
      },
    });
    expect(request).not.toHaveProperty("data.threadId");
  });
  it("keeps a saved token when editing and clears the label", () => {
    expect(
      buildBaleRequest({ ...toBaleFormValues(null), chatId: "@channel" }, true),
    ).toMatchObject({
      kind: "update",
      json: { botToken: undefined, chatId: "@channel", chatLabel: null },
    });
  });
  it("validates token and chat shape before submitting", () => {
    expect(
      buildBaleRequest({ ...toBaleFormValues(null), chatId: "abc" }, false),
    ).toMatchObject({ kind: "invalid", field: "chatId" });
    expect(
      buildBaleRequest(
        { ...toBaleFormValues(null), chatId: "123", botToken: "invalid" },
        false,
      ),
    ).toMatchObject({ kind: "invalid", field: "botToken" });
  });
});
