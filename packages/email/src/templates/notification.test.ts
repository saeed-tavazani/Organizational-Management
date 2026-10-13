import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import NotificationEmail from "./notification";

describe("NotificationEmail", () => {
  it("renders Persian chrome in right-to-left direction", async () => {
    const html = await render(
      createElement(NotificationEmail, {
        title: "تسکی به شما اختصاص داده شد",
        message: "لطفاً طرح را بررسی کنید.",
        actionUrl: "https://kaneo.example/task/1",
        locale: "fa-IR",
      }),
    );
    expect(html).toContain("باز کردن در Kaneo");
    expect(html).toContain("اعلانی با تنظیمات دریافت اعلان شما مطابقت دارد.");
    expect(html).toContain('dir="rtl"');
  });

  it("renders the task card with localized priority and due date", async () => {
    const html = await render(
      createElement(NotificationEmail, {
        title: "Task assigned to you",
        message: "You were assigned to Redesign emails.",
        actionUrl: "https://kaneo.example/task/1",
        breadcrumb: "Acme / Website",
        task: {
          ticket: "KAN-128",
          title: "Redesign emails",
          labels: [{ name: "Design", color: "#8E51FF" }],
          priority: "high",
          dueDate: new Date("2026-10-14T00:00:00Z"),
          dueStatus: "due-soon",
          column: { name: "In progress", icon: "circle-dot", count: 3 },
        },
      }),
    );
    expect(html).toContain("KAN-128");
    expect(html).toContain("Design");
    expect(html).toContain('alt="High priority"');
    expect(html).toContain("Oct 14");
    expect(html).toContain("In progress");
    expect(html).toContain("Open task");
  });
});
