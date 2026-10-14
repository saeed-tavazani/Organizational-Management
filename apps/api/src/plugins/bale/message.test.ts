import { describe, expect, it } from "vite-plus/test";
import { buildBaleMessage, truncateBaleText } from "./message";
import type { ChatEventData } from "../chat-event-data";

const data: ChatEventData = {
  taskNumber: 12,
  taskTitle: "تسک *مهم*",
  projectName: "پروژه",
  status: "custom_status",
  priority: "high",
  actorName: "کاربر",
  taskUrl: "https://example.com/task/(12)",
};
describe("Bale message formatting", () => {
  it("uses Persian labels, preserves custom values and escapes injected markup", () => {
    const text = buildBaleMessage(
      "تسک جدید",
      "[fake](https://evil.test) _text_ `code`",
      data,
    );
    expect(text).toContain("تسک: #12 تسک \\*مهم\\*");
    expect(text).toContain("custom\\_status");
    expect(text).toContain("\\[fake\\]\\(https://evil.test\\)");
    expect(text).toContain("[مشاهده تسک](https://example.com/task/%2812%29)");
    expect(text).not.toContain("<b>");
  });
  it("bounds all fields together and retains well-formed formatting", () => {
    const long = "😀*[link](bad)".repeat(1000);
    const text = buildBaleMessage(long, long, {
      ...data,
      taskTitle: long,
      projectName: long,
      status: long,
      priority: long,
      actorName: long,
      taskUrl: "https://example.com/" + "x".repeat(1750),
    });
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toContain("[مشاهده تسک](https://example.com/");
    expect(text).not.toMatch(/[\uD800-\uDBFF]…/);
  });
  it("omits unsafe and missing client links without dropping the update", () => {
    for (const taskUrl of [
      null,
      "not a url",
      "javascript:alert(1)",
      "https://example.com/" + "x".repeat(1900),
    ]) {
      expect(
        buildBaleMessage("تسک جدید", "توضیح", { ...data, taskUrl }),
      ).not.toContain("[مشاهده تسک]");
    }
    expect(truncateBaleText("abc😀def", 5)).toBe("abc…");
  });
});
