import type { EmailLocale } from "../templates/resolve-locale";
import type { FooterLink } from "./email-footer";

const labels: Record<EmailLocale, { help: string; privacy: string }> = {
  en: { help: "Help", privacy: "Privacy" },
  fa: { help: "راهنما", privacy: "حریم خصوصی" },
};

export function footerLinks(
  locale: EmailLocale,
  leading: FooterLink[] = [],
): FooterLink[] {
  const copy = labels[locale];

  return [
    ...leading,
    { label: "kaneo.app", href: "https://kaneo.app" },
    { label: copy.help, href: "https://kaneo.app/docs" },
    { label: copy.privacy, href: "https://kaneo.app/privacy" },
  ];
}
