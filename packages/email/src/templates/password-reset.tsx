import React from "react";
import { EmailButton } from "../components/email-button";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailNote } from "../components/email-note";
import { EmailShell } from "../components/email-shell";
import { FallbackLink } from "../components/fallback-link";
import { footerLinks } from "../components/footer-links";
import {
  type RequestContext,
  RequestDetails,
} from "../components/request-details";
import { passwordResetReason } from "../components/security-reasons";
import {
  emailHtmlDir,
  emailHtmlLang,
  resolveEmailLocale,
} from "./resolve-locale";

void React;

export type PasswordResetEmailProps = RequestContext & {
  resetLink: string;
  userName?: string;
  locale?: string | null;
};

const messages = {
  en: {
    preview:
      "Use the link inside to choose a new password. It expires in 1 hour.",
    title: "Reset your password",
    subtitleWithName: (name: string) =>
      `Hi ${name}, use the button below to choose a new password. The link works once and expires in 1 hour.`,
    subtitleDefault:
      "Use the button below to choose a new password. The link works once and expires in 1 hour.",
    cta: "Reset password",
    fallback: "Button not working? Paste this link into your browser:",
    ignoreTitle: "Didn't ask for this?",
    ignore:
      "You can ignore this email. Your password stays the same until someone opens this link and sets a new one.",
    footer: "Kaneo security email",
  },
  fa: {
    preview:
      "برای انتخاب گذرواژهٔ تازه از پیوند داخل ایمیل استفاده کنید. پیوند پس از یک ساعت منقضی می‌شود.",
    title: "بازنشانی گذرواژه",
    subtitleWithName: (name: string) =>
      `${name} عزیز، برای انتخاب گذرواژهٔ تازه دکمهٔ زیر را بزنید. پیوند یک‌بار قابل استفاده است و پس از یک ساعت منقضی می‌شود.`,
    subtitleDefault:
      "برای انتخاب گذرواژهٔ تازه دکمهٔ زیر را بزنید. پیوند یک‌بار قابل استفاده است و پس از یک ساعت منقضی می‌شود.",
    cta: "بازنشانی گذرواژه",
    fallback: "دکمه کار نمی‌کند؟ این پیوند را در مرورگر باز کنید:",
    ignoreTitle: "این درخواست را نداده‌اید؟",
    ignore:
      "می‌توانید این ایمیل را نادیده بگیرید. گذرواژهٔ شما تا زمانی که کسی این پیوند را باز و گذرواژه‌ای تازه انتخاب نکند، تغییر نمی‌کند.",
    footer: "ایمیل امنیتی Kaneo",
  },
} as const;

const PasswordResetEmail = ({
  resetLink,
  userName,
  locale,
  email,
  instance,
  requestedAt,
  device,
}: PasswordResetEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy = messages[emailLocale];

  return (
    <EmailShell
      title={copy.title}
      preview={copy.preview}
      lang={emailHtmlLang(emailLocale)}
      dir={emailHtmlDir(emailLocale)}
    >
      <EmailIntro
        title={copy.title}
        subtitle={
          userName ? copy.subtitleWithName(userName) : copy.subtitleDefault
        }
      />
      <EmailButton href={resetLink} icon="key-round-light">
        {copy.cta}
      </EmailButton>
      <FallbackLink label={copy.fallback} href={resetLink} />
      <RequestDetails
        locale={emailLocale}
        email={email}
        instance={instance}
        requestedAt={requestedAt}
        device={device}
      />
      <EmailNote title={copy.ignoreTitle}>{copy.ignore}</EmailNote>
      <EmailFooter
        title={copy.footer}
        reason={
          email ? passwordResetReason[emailLocale](email, instance) : undefined
        }
        links={footerLinks(emailLocale)}
      />
    </EmailShell>
  );
};

PasswordResetEmail.PreviewProps = {
  resetLink: "https://cloud.kaneo.app/auth/reset-password?token=example",
  userName: "Maya",
  locale: "en-US",
  email: "maya@example.com",
  instance: "cloud.kaneo.app",
  requestedAt: "2026-10-11T14:12:00.000Z",
  device: { browser: "Safari", os: "iPhone" },
} as PasswordResetEmailProps;

export default PasswordResetEmail;
