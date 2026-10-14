import React from "react";
import { EmailFooter } from "../components/email-footer";
import { EmailIntro } from "../components/email-intro";
import { EmailNote } from "../components/email-note";
import { EmailShell } from "../components/email-shell";
import { footerLinks } from "../components/footer-links";
import { OtpCode } from "../components/otp-code";
import {
  type RequestContext,
  RequestDetails,
} from "../components/request-details";
import { signInReason } from "../components/security-reasons";
import { OTP_EXPIRY_SECONDS } from "../otp-expiry";
import {
  emailHtmlDir,
  emailHtmlLang,
  resolveEmailLocale,
} from "./resolve-locale";

void React;

export type OtpEmailProps = RequestContext & {
  otp: string;
  locale?: string | null;
};

const minutes = OTP_EXPIRY_SECONDS / 60;

const messages = {
  en: {
    preview: `Enter it on the sign-in page to continue. It expires in ${minutes} minutes.`,
    title: "Sign in to Montask",
    subtitle:
      "Enter this code on the sign-in page to finish signing in. It works once.",
    codeLabel: "Verification code",
    code: "is your Montask verification code.",
    expiry: `This code expires in ${minutes} minutes.`,
    ignoreTitle: "Didn't try to sign in?",
    ignore:
      "You can ignore this email. Nobody can get into your account without this code. Montask will never ask you to share it.",
    footer: "Montask security email",
  },
  fa: {
    preview: `برای ادامه، کد را در صفحهٔ ورود وارد کنید. کد پس از ${minutes} دقیقه منقضی می‌شود.`,
    title: "ورود به Montask",
    subtitle:
      "برای تکمیل ورود، این کد را در صفحهٔ ورود وارد کنید. کد فقط یک‌بار قابل استفاده است.",
    codeLabel: "کد تأیید",
    code: "کد تأیید Montask شماست.",
    expiry: `این کد پس از ${minutes} دقیقه منقضی می‌شود.`,
    ignoreTitle: "برای ورود درخواست نداده‌اید؟",
    ignore:
      "می‌توانید این ایمیل را نادیده بگیرید. بدون این کد کسی نمی‌تواند وارد حساب شما شود. Montask هرگز از شما نمی‌خواهد کد را در اختیار دیگران بگذارید.",
    footer: "ایمیل امنیتی Montask",
  },
} as const;

const OtpEmail = ({
  otp,
  locale,
  email,
  instance,
  requestedAt,
  device,
}: OtpEmailProps) => {
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
      <OtpCode
        code={otp}
        label={copy.codeLabel}
        hint={`${otp} ${copy.code} ${copy.expiry}`}
      />
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

OtpEmail.PreviewProps = {
  otp: "482913",
  locale: "en-US",
  email: "maya@example.com",
  instance: "cloud.kaneo.app",
  requestedAt: "2026-10-11T14:12:00.000Z",
  device: { browser: "Safari", os: "iPhone" },
} as OtpEmailProps;

export default OtpEmail;
