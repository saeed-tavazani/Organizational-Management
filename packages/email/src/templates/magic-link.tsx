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
import { signInReason } from "../components/security-reasons";
import {
  emailHtmlDir,
  emailHtmlLang,
  resolveEmailLocale,
} from "./resolve-locale";

void React;

export type MagicLinkEmailProps = RequestContext & {
  magicLink: string;
  locale?: string | null;
};

const messages = {
  en: {
    preview: "Use it to finish signing in. It expires in 5 minutes.",
    title: "Sign in to Kaneo",
    subtitle:
      "Use the button below to finish signing in. The link works once and expires in 5 minutes.",
    cta: "Sign in to Kaneo",
    fallback: "Button not working? Paste this link into your browser:",
    ignoreTitle: "Didn't try to sign in?",
    ignore:
      "You can ignore this email. Nobody can get into your account without opening this link. Kaneo will never ask you to forward it.",
    footer: "Kaneo security email",
  },
  fa: {
    preview:
      "برای تکمیل ورود از این پیوند استفاده کنید. پیوند پس از ۵ دقیقه منقضی می‌شود.",
    title: "ورود به Kaneo",
    subtitle:
      "برای تکمیل ورود، دکمهٔ زیر را بزنید. پیوند فقط یک‌بار قابل استفاده است و پس از ۵ دقیقه منقضی می‌شود.",
    cta: "ورود به Kaneo",
    fallback: "دکمه کار نمی‌کند؟ این پیوند را در مرورگر باز کنید:",
    ignoreTitle: "برای ورود درخواست نداده‌اید؟",
    ignore:
      "می‌توانید این ایمیل را نادیده بگیرید. بدون باز کردن این پیوند کسی نمی‌تواند وارد حساب شما شود. Kaneo هرگز از شما نمی‌خواهد پیوند را برای دیگران بفرستید.",
    footer: "ایمیل امنیتی Kaneo",
  },
} as const;

const MagicLinkEmail = ({
  magicLink,
  locale,
  email,
  instance,
  requestedAt,
  device,
}: MagicLinkEmailProps) => {
  const emailLocale = resolveEmailLocale(locale);
  const copy = messages[emailLocale];

  return (
    <EmailShell
      title={copy.title}
      preview={copy.preview}
      lang={emailHtmlLang(emailLocale)}
      dir={emailHtmlDir(emailLocale)}
    >
      <EmailIntro title={copy.title} subtitle={copy.subtitle} />
      <EmailButton href={magicLink} icon="log-in-light">
        {copy.cta}
      </EmailButton>
      <FallbackLink label={copy.fallback} href={magicLink} />
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
        reason={email ? signInReason[emailLocale](email, instance) : undefined}
        links={footerLinks(emailLocale)}
      />
    </EmailShell>
  );
};

MagicLinkEmail.PreviewProps = {
  magicLink: "https://cloud.kaneo.app/api/auth/magic-link/verify?token=example",
  locale: "en-US",
  email: "maya@example.com",
  instance: "cloud.kaneo.app",
  requestedAt: "2026-10-11T14:12:00.000Z",
  device: { browser: "Safari", os: "iPhone" },
} as MagicLinkEmailProps;

export default MagicLinkEmail;
