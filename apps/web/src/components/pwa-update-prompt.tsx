import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/lib/toast";

export function PwaUpdatePrompt() {
  const { t } = useTranslation("common");
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;

    toast(t("pwa.updateTitle"), {
      description: t("pwa.updateDescription"),
      action: {
        label: t("pwa.updateAction"),
        onClick: () => void updateServiceWorker(true),
      },
    });
  }, [needRefresh, t, updateServiceWorker]);

  return null;
}
