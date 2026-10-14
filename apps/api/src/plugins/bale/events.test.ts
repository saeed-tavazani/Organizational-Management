import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { balePlugin } from "./index";
import { defaultBaleEvents } from "./config";
import type { ChatEventData } from "../chat-event-data";
import type { PluginContext } from "../types";

const mocks = vi.hoisted(() => ({ data: vi.fn(), send: vi.fn() }));
vi.mock("../chat-event-data", () => ({ getChatEventData: mocks.data }));
vi.mock("./client", () => ({ postToBale: mocks.send }));
const token = `123456789:${"a".repeat(40)}`;
const context: PluginContext = {
  integrationId: "bale",
  projectId: "project",
  config: {
    botToken: token,
    chatId: "123",
    events: Object.fromEntries(
      Object.keys(defaultBaleEvents).map((key) => [key, true]),
    ),
  },
};
const data: ChatEventData = {
  taskTitle: "عنوان",
  taskNumber: 12,
  projectName: "پروژه",
  taskUrl: "https://example.com/task/12",
  actorName: "کاربر",
  status: "custom",
  priority: "high",
};
const base = {
  taskId: "task",
  projectId: "project",
  userId: "user",
  title: "عنوان",
};
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("Bale event dispatch", () => {
  it("formats and sends every supported event through the project-scoped lookup", async () => {
    mocks.data.mockResolvedValue(data);
    const handlers = [
      () =>
        balePlugin.onTaskCreated?.(
          {
            ...base,
            description: null,
            status: "custom",
            priority: "high",
            number: 12,
          },
          context,
        ),
      () =>
        balePlugin.onTaskStatusChanged?.(
          { ...base, oldStatus: "old", newStatus: "custom" },
          context,
        ),
      () =>
        balePlugin.onTaskPriorityChanged?.(
          { ...base, oldPriority: "low", newPriority: "high" },
          context,
        ),
      () =>
        balePlugin.onTaskTitleChanged?.(
          { ...base, oldTitle: "قبل", newTitle: "بعد" },
          context,
        ),
      () =>
        balePlugin.onTaskDescriptionChanged?.(
          { ...base, oldDescription: null, newDescription: "توضیح" },
          context,
        ),
      () =>
        balePlugin.onTaskCommentCreated?.({ ...base, comment: "نظر" }, context),
    ];
    for (const handle of handlers) await handle();
    expect(mocks.data).toHaveBeenCalledTimes(6);
    expect(mocks.data).toHaveBeenCalledWith("task", "project", "user");
    expect(mocks.send).toHaveBeenCalledTimes(6);
    for (const call of mocks.send.mock.calls) {
      expect(call[0]).toBe(token);
      expect(call[1]).toEqual({
        chat_id: "123",
        text: expect.stringContaining("پروژه: پروژه"),
      });
      expect(call[1].text).toContain("#12");
      expect(call[1].text).not.toContain(token);
    }
  });
  it("skips disabled events, mismatched projects and missing tasks", async () => {
    const event = { ...base, comment: "نظر" };
    await balePlugin.onTaskCommentCreated?.(event, {
      ...context,
      config: { ...context.config, events: { taskCommentCreated: false } },
    });
    await balePlugin.onTaskCommentCreated?.(
      { ...event, projectId: "private-project" },
      context,
    );
    expect(mocks.data).not.toHaveBeenCalled();
    mocks.data.mockResolvedValue(null);
    await balePlugin.onTaskCommentCreated?.(event, context);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not expose malformed credentials or token-bearing provider errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await balePlugin.onTaskCommentCreated?.(
      { ...base, comment: "نظر" },
      { ...context, config: { ...context.config, chatId: "bad" } },
    );
    expect(mocks.data).not.toHaveBeenCalled();
    mocks.data.mockResolvedValue(data);
    mocks.send.mockRejectedValue(
      new Error(`https://tapi.bale.ai/bot${token}/sendMessage`),
    );
    await expect(
      balePlugin.onTaskCommentCreated?.({ ...base, comment: "نظر" }, context),
    ).resolves.toBeUndefined();
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(log).toHaveBeenCalledWith(
      "Bale project message failed",
      expect.objectContaining({ error: "Outbound request failed" }),
    );
  });
});
