import { useDirection } from "@base-ui/react/direction-provider";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { i18n, preloadNamespaces } from "./index";
import { AppI18nProvider } from "./provider";

const auth = vi.hoisted(() => ({ user: null as { locale: string } | null }));
vi.mock("@/components/providers/auth-provider/hooks/use-auth", () => ({
  default: () => auth,
}));

function DirectionProbe() {
  const direction = useDirection();
  return <output aria-label="direction">{direction}</output>;
}

afterEach(() => {
  cleanup();
  auth.user = null;
});

describe("AppI18nProvider", () => {
  it("follows saved Persian preferences and live changes back to English", async () => {
    await preloadNamespaces("en-US");
    await preloadNamespaces("fa-IR");
    auth.user = { locale: "fa-IR" };
    render(
      <AppI18nProvider>
        <DirectionProbe />
      </AppI18nProvider>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText("direction")).toHaveTextContent("rtl");
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("fa-IR");
    });
    await act(() => i18n.changeLanguage("en-US"));
    expect(screen.getByLabelText("direction")).toHaveTextContent("ltr");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en-US");
  });
});
