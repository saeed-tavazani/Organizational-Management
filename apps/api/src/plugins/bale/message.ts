import persian from "../../../../../i18n/fa-IR.json";
import type { ChatEventData } from "../chat-event-data";

export const baleMessages = persian.baleProjectMessages;

export function truncateBaleText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  // Avoid splitting a surrogate pair when shortening user text.
  let shortened = value.slice(0, limit - 1);
  if (/[\uD800-\uDBFF]$/.test(shortened)) shortened = shortened.slice(0, -1);
  return `${shortened}…`;
}

function escapeMarkdown(value: string, limit: number): string {
  let result = "";
  for (const char of value.replace(/\s+/g, " ")) {
    const escaped = /[\\`*_[\]()]/.test(char) ? `\\${char}` : char;
    if (result.length + escaped.length > limit - 1) return `${result}…`;
    result += escaped;
  }
  return result;
}

export function fillBaleTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => values[key] ?? "",
  );
}

export function buildBaleMessage(
  title: string,
  body: string,
  data: ChatEventData,
): string {
  const label = data.taskNumber === null ? "" : `#${data.taskNumber} `;
  const lines = [
    ` *${escapeMarkdown(title, 80)}* `,
    escapeMarkdown(body, 450),
    "",
    `${baleMessages.task}: ${label}${escapeMarkdown(data.taskTitle, 450)}`,
    `${baleMessages.project}: ${escapeMarkdown(data.projectName, 200)}`,
    `${baleMessages.status}: ${escapeMarkdown(data.status ?? baleMessages.unknown, 120)}`,
    `${baleMessages.priority}: ${escapeMarkdown(data.priority ?? baleMessages.unknown, 120)}`,
    `${baleMessages.actor}: ${escapeMarkdown(data.actorName ?? "Montask", 150)}`,
  ];
  if (data.taskUrl) {
    try {
      const url = new URL(data.taskUrl);
      const destination = url
        .toString()
        .replace(/[()[\]\\]/g, (char) =>
          encodeURIComponent(char)
            .replaceAll("(", "%28")
            .replaceAll(")", "%29"),
        );
      if (
        ["https:", "http:"].includes(url.protocol) &&
        destination.length <= 1800
      ) {
        lines.push(`[${baleMessages.link}](${destination})`);
      }
    } catch {
      /* A deployment without a valid client URL can still send updates. */
    }
  }
  // Field budgets keep the complete message below Bale's 4096-character limit.
  return lines.join("\n");
}
