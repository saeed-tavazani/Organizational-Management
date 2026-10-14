import { Text } from "@react-email/components";
import React from "react";
import { BoardColumn, type BoardColumnIcon } from "../components/board-column";
import { EmailButton } from "../components/email-button";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { type DateInput, formatShortDate } from "../components/format-date";
import { Spacer } from "../components/spacer";
import {
  TaskCard,
  type TaskCardPriority,
  type TaskCardProps,
} from "../components/task-card";
import { colors } from "../components/tokens";
import {
  emailHtmlDir,
  emailHtmlLang,
  resolveEmailLocale,
} from "./resolve-locale";

void React;

export type NotificationEmailTask = Omit<
  TaskCardProps,
  "dueDate" | "priorityLabel"
> & {
  dueDate?: DateInput;
  column?: {
    name: string;
    icon?: BoardColumnIcon;
    count?: number;
  };
};

export type NotificationEmailProps = {
  title: string;
  message: string;
  actionUrl?: string | null;
  actionLabel?: string;
  locale?: string | null;
  breadcrumb?: string;
  task?: NotificationEmailTask;
  settingsUrl?: string;
};

const messages = {
  en: {
    preview: "You have a new Montask notification",
    subtitle: "A notification matched your delivery preferences.",
    footer: "Montask notification",
    actionLabel: "Open in Montask",
    openTask: "Open task",
    manage: "Manage notifications",
    priority: {
      urgent: "Urgent priority",
      high: "High priority",
      medium: "Medium priority",
      low: "Low priority",
    },
  },
  fa: {
    preview: "اعلان تازه‌ای از Montask دارید",
    subtitle: "اعلانی با تنظیمات دریافت اعلان شما مطابقت دارد.",
    footer: "اعلان Montask",
    actionLabel: "باز کردن در Montask",
    openTask: "باز کردن تسک",
    manage: "مدیریت اعلان‌ها",
    priority: {
      urgent: "اولویت فوری",
      high: "اولویت بالا",
      medium: "اولویت متوسط",
      low: "اولویت پایین",
    },
  },
} as const;

const NotificationEmail = ({
  title,
  message,
  actionUrl,
  actionLabel,
  locale,
  breadcrumb,
  task,
  settingsUrl,
}: NotificationEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy = messages[emailLocale];
  const lang = emailHtmlLang(emailLocale);
  const priority: TaskCardPriority | undefined = task?.priority;
  const card = task ? (
    <TaskCard
      {...task}
      dueDate={task.dueDate ? formatShortDate(task.dueDate, lang) : undefined}
      priorityLabel={priority ? copy.priority[priority] : undefined}
    />
  ) : null;

  return (
    <EmailShell
      title={title}
      preview={`${message} ${copy.preview}`}
      lang={lang}
      dir={emailHtmlDir(emailLocale)}
    >
      <EmailIntro title={title} subtitle={message} />
      {breadcrumb ? (
        <Text className="k-muted" style={breadcrumbStyle}>
          {breadcrumb}
        </Text>
      ) : null}
      {task?.column ? (
        <BoardColumn
          name={task.column.name}
          icon={task.column.icon}
          count={task.column.count}
        >
          {card}
        </BoardColumn>
      ) : (
        card
      )}
      {actionUrl ? (
        <>
          {task ? <Spacer size={20} /> : null}
          <EmailButton href={actionUrl} icon="arrow-up-right-light">
            {actionLabel ?? (task ? copy.openTask : copy.actionLabel)}
          </EmailButton>
        </>
      ) : null}
      <Spacer size={40} />
      <EmailFooter
        title={copy.footer}
        reason={copy.subtitle}
        links={footerLinks(
          emailLocale,
          settingsUrl ? [{ label: copy.manage, href: settingsUrl }] : [],
        )}
      />
    </EmailShell>
  );
};

const breadcrumbStyle = {
  margin: "-16px 0 20px",
  color: colors.mutedForeground,
  fontSize: "14px",
  lineHeight: "20px",
};

NotificationEmail.PreviewProps = {
  title: "Sarah Chen assigned you a task",
  message: "You were assigned to Redesign transactional emails.",
  actionUrl: "https://cloud.kaneo.app/acme/task/KAN-128",
  locale: "en-US",
  breadcrumb: "Acme / Website",
  settingsUrl:
    "https://cloud.kaneo.app/dashboard/settings/account/notifications",
  task: {
    ticket: "KAN-128",
    title: "Redesign transactional emails",
    labels: [
      { name: "Design", color: "#8E51FF" },
      { name: "Email", color: "#00BC7D" },
    ],
    priority: "high",
    priorityLabel: "High priority",
    dueDate: "2026-10-14T00:00:00.000Z",
    dueStatus: "due-soon",
    assigneeInitials: "MK",
    column: { name: "In progress", icon: "circle-dot", count: 3 },
  },
} as NotificationEmailProps;

export default NotificationEmail;
