import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsRow } from "@/components/settings/settings-row";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "@/fetchers/notification-preferences/get-notification-preferences";
import { useUpdateNotificationPreferences } from "@/hooks/mutations/notification-preferences/use-notification-preferences";

export function BaleChannelRow({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const { t } = useTranslation();
  const { mutate, isPending } = useUpdateNotificationPreferences();
  return (
    <SettingsRow
      icon={<MessageCircle />}
      title={t("auth:phone.bale")}
      description={preferences.phoneNumber || t("auth:phone.unavailable")}
    >
      <Switch
        aria-label={t("auth:phone.bale")}
        checked={Boolean(preferences.baleEnabled)}
        disabled={isPending || !preferences.baleConfigured}
        onCheckedChange={(checked) => mutate({ baleEnabled: checked })}
      />
    </SettingsRow>
  );
}
