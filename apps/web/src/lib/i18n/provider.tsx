import { DirectionProvider } from "@base-ui/react/direction-provider";
import { type PropsWithChildren, useEffect, useMemo } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import {
  getBrowserLocale,
  i18n,
  preloadNamespaces,
  resolveLocale,
} from "./index";
import { getLocaleDirection } from "./direction";

export function AppI18nProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { i18n: instance } = useTranslation("common", { i18n });

  const resolvedLocale = useMemo(
    () => resolveLocale(user?.locale, getBrowserLocale()),
    [user?.locale],
  );

  useEffect(() => {
    void i18n
      .changeLanguage(resolvedLocale)
      .then(() => preloadNamespaces(resolvedLocale));
  }, [resolvedLocale]);

  const direction = getLocaleDirection(
    resolveLocale(instance.language, resolvedLocale),
  );

  return (
    <I18nextProvider i18n={i18n}>
      <DirectionProvider direction={direction}>{children}</DirectionProvider>
    </I18nextProvider>
  );
}
