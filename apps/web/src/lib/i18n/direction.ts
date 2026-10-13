import type { AppLocale } from "@i18n/resources";

export function getLocaleDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "fa-IR" ? "rtl" : "ltr";
}

export function syncDocumentLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getLocaleDirection(locale);
}
