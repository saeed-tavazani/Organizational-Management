import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { OptionalMarker } from "@/components/project/integrations/delivery-panel/optional-marker";
import { SavedValueInput } from "@/components/project/integrations/delivery-panel/saved-value-input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { BaleFormValues } from "./bale-form-values";

type BaleFieldsProps = {
  control: Control<BaleFormValues>;
  connected: boolean;
  maskedBotToken: string | undefined;
};

export function BaleFields({
  control,
  connected,
  maskedBotToken,
}: BaleFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField
        control={control}
        name="botToken"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>{t("settings:baleIntegration.botTokenLabel")}</FormLabel>
            <SavedValueInput
              {...field}
              autoComplete="off"
              className={connected ? undefined : "font-mono"}
              placeholder={
                connected
                  ? t("settings:baleIntegration.botTokenSavedPlaceholder")
                  : t("settings:baleIntegration.botTokenPlaceholder")
              }
              saved={connected && !field.value}
              type="password"
            />
            <FormDescription className="text-xs">
              {connected
                ? t("settings:baleIntegration.botTokenHintConfigured", {
                    token: maskedBotToken,
                  })
                : t("settings:baleIntegration.botTokenHint")}
            </FormDescription>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="chatId"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>{t("settings:baleIntegration.chatIdLabel")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="font-mono"
                placeholder={t("settings:baleIntegration.chatIdPlaceholder")}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="chatLabel"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>
              {t("settings:baleIntegration.chatLabelLabel")} <OptionalMarker />
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t("settings:baleIntegration.chatLabelPlaceholder")}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>
  );
}
