import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { i18n, preloadNamespaces } from "@/lib/i18n";
import { useLocale } from "./use-locale";

const mocks = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: mocks }));

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  await preloadNamespaces("en-US");
  await preloadNamespaces("fa-IR");
  mocks.updateUser.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => cleanup());

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useLocale(), { wrapper }), invalidate };
}

describe("saved locale", () => {
  it("saves Persian through the account service, refreshes the session and switches direction", async () => {
    const { result, invalidate } = setup();
    await act(() => result.current.setLocale("fa-IR"));
    expect(mocks.updateUser).toHaveBeenCalledWith({ locale: "fa-IR" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["session"] });
    expect(result.current.locale).toBe("fa-IR");
    expect(document.documentElement.dir).toBe("rtl");
    await act(() => result.current.setLocale("en-US"));
    expect(result.current.locale).toBe("en-US");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("keeps the current language and direction when the account service rejects the update", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "Update failed" } });
    const { result, invalidate } = setup();
    await act(async () => {
      await expect(result.current.setLocale("fa-IR")).rejects.toThrow(
        "Update failed",
      );
    });
    expect(invalidate).not.toHaveBeenCalled();
    expect(result.current.locale).toBe("en-US");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
