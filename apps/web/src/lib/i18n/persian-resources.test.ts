import english from "@i18n/en-US.json";
import persian from "@i18n/fa-IR.json";
import { loadLocale } from "@i18n/resources";
import { createInstance } from "i18next";
import { describe, expect, it } from "vite-plus/test";

function flatten(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof entry === "string"
        ? [[path, entry]]
        : Object.entries(flatten(entry, path));
    }),
  );
}

describe("Persian translations", () => {
  it("loads the complete locale and preserves interpolation and rich text tags", async () => {
    expect(await loadLocale("fa-IR")).toEqual(persian);
    const reference = flatten(english);
    const translated = flatten(persian);
    expect(Object.keys(translated)).toEqual(Object.keys(reference));
    const tokens = (value: string) =>
      value.match(/\{\{[^}]+\}\}|<\/?[a-z]+>/g)?.sort() ?? [];
    for (const [key, value] of Object.entries(reference)) {
      expect(tokens(translated[key]), key).toEqual(tokens(value));
    }
  });

  it("resolves Persian text, interpolation and zero/one/other plural counts", async () => {
    const instance = createInstance();
    await instance.init({ lng: "fa-IR", resources: { "fa-IR": persian } });
    expect(instance.t("settings:preferencesPage.language")).toBe("زبان");
    for (const count of [0, 1, 2, 12]) {
      expect(instance.t("tasks:toolbar.taskCount", { count })).toBe(
        `${count} کار`,
      );
    }
    expect(
      instance.t("auth:signIn.invitation.title", {
        inviterName: "مریم",
        workspaceName: "تیم ما",
      }),
    ).toBe("مریم شما را به تیم ما دعوت کرده است");
  });
});
