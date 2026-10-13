export const supportedLocales = ["en-US", "fa-IR"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en-US";

export function isSupportedLocale(locale: string): locale is AppLocale {
  return (supportedLocales as readonly string[]).includes(locale);
}

export async function loadLocale(locale: AppLocale): Promise<object> {
  switch (locale) {
    case "en-US":
      return (await import("./en-US.json")).default;
    case "fa-IR":
      return (await import("./fa-IR.json")).default;
    default:
      throw new Error(`Unsupported locale: ${locale}`);
  }
}
