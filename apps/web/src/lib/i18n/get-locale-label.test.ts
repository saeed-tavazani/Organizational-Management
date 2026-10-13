import { type AppLocale, supportedLocales } from "@i18n/resources";
import { describe, expect, it } from "vite-plus/test";
import { getLocaleLabel } from "./get-locale-label";

const label = (locale: string) => getLocaleLabel(locale as AppLocale);

describe("getLocaleLabel", () => {
  it("labels the supported English and Persian locales", () => {
    expect(label("en-US")).toBe("English");
    expect(label("fa-IR")).toBe("فارسی");
  });

  it("gives every supported locale a unique label", () => {
    const labels = supportedLocales.map(label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
