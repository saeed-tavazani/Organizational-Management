import { safeOutboundError } from "../../utils/outbound-request";
import { getChatEventData } from "../chat-event-data";
import type {
  PluginContext,
  TaskCreatedEvent,
  TaskStatusChangedEvent,
  TaskPriorityChangedEvent,
  TaskTitleChangedEvent,
  TaskDescriptionChangedEvent,
  TaskCommentCreatedEvent,
} from "../types";
import { postToBale } from "./client";
import {
  baleConfigSchema,
  normalizeBaleConfig,
  type BaleEventKey,
} from "./config";
import {
  baleMessages,
  buildBaleMessage,
  fillBaleTemplate,
  truncateBaleText,
} from "./message";

async function runBaleHandler(
  event: { taskId: string; projectId: string; userId: string | null },
  context: PluginContext,
  key: BaleEventKey,
  body: string,
): Promise<void> {
  if (context.projectId !== event.projectId) return;
  const parsed = baleConfigSchema.safeParse(context.config);
  if (!parsed.success) {
    console.error("Invalid Bale plugin configuration", {
      integrationId: context.integrationId,
    });
    return;
  }
  const config = normalizeBaleConfig(parsed.data);
  if (!config.events?.[key]) return;
  const data = await getChatEventData(
    event.taskId,
    context.projectId,
    event.userId,
  );
  if (!data) return;
  try {
    await postToBale(config.botToken, {
      chat_id: config.chatId,
      text: buildBaleMessage(baleMessages[key], body, data),
    });
  } catch (error) {
    console.error("Bale project message failed", {
      error: safeOutboundError(error),
      integrationId: context.integrationId,
    });
  }
}

export async function handleTaskCreated(
  event: TaskCreatedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskCreated",
    fillBaleTemplate(baleMessages.taskCreatedBody, { title: event.title }),
  );
}
export async function handleTaskStatusChanged(
  event: TaskStatusChangedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskStatusChanged",
    fillBaleTemplate(baleMessages.taskStatusChangedBody, {
      old: event.oldStatus,
      new: event.newStatus,
    }),
  );
}
export async function handleTaskPriorityChanged(
  event: TaskPriorityChangedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskPriorityChanged",
    fillBaleTemplate(baleMessages.taskPriorityChangedBody, {
      old: event.oldPriority,
      new: event.newPriority,
    }),
  );
}
export async function handleTaskTitleChanged(
  event: TaskTitleChangedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskTitleChanged",
    fillBaleTemplate(baleMessages.taskTitleChangedBody, {
      old: truncateBaleText(event.oldTitle, 120),
      new: truncateBaleText(event.newTitle, 120),
    }),
  );
}
export async function handleTaskDescriptionChanged(
  event: TaskDescriptionChangedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskDescriptionChanged",
    fillBaleTemplate(baleMessages.taskDescriptionChangedBody, {
      description: truncateBaleText(
        (event.newDescription ?? "").replace(/\s+/g, " "),
        160,
      ),
    }),
  );
}
export async function handleTaskCommentCreated(
  event: TaskCommentCreatedEvent,
  context: PluginContext,
): Promise<void> {
  await runBaleHandler(
    event,
    context,
    "taskCommentCreated",
    truncateBaleText(event.comment.replace(/\s+/g, " "), 200),
  );
}
