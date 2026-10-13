import { afterEach, describe, expect, it } from "vite-plus/test";
import { supportedLocales } from "@i18n/resources";
import { getLocaleDirection, syncDocumentLocale } from "./direction";

afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("locale direction", () => {
  it("uses RTL for Persian and LTR for the other supported languages", () => {
    for (const locale of supportedLocales) {
      expect(getLocaleDirection(locale)).toBe(
        locale === "fa-IR" ? "rtl" : "ltr",
      );
    }
  });

  it("restores both document attributes when switching back from Persian", () => {
    syncDocumentLocale("fa-IR");
    expect(document.documentElement.lang).toBe("fa-IR");
    expect(document.documentElement.dir).toBe("rtl");
    syncDocumentLocale("en-US");
    expect(document.documentElement.lang).toBe("en-US");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
