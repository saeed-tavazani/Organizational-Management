import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getBaleDeliveries } from "@/fetchers/user/contact";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsSection } from "@/components/settings/settings-section";

export function BaleDeliveries() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bale-deliveries"],
    queryFn: getBaleDeliveries,
    refetchInterval: 15_000,
  });
  return (
    <SettingsSection title={t("auth:phone.deliveries")}>
      <SettingsCard className="p-4">
        {isLoading ? (
          <p role="status">{t("auth:phone.loading")}</p>
        ) : error ? (
          <p role="alert">{t("auth:phone.failed")}</p>
        ) : (
          <ul className="space-y-2">
            {data?.map((delivery) => (
              <li
                key={delivery.id}
                className="flex justify-between gap-3 text-sm"
              >
                <time dateTime={delivery.createdAt}>
                  {new Date(delivery.createdAt).toLocaleString()}
                </time>
                <span>
                  {t(`auth:phone.status.${delivery.status}`, {
                    defaultValue: delivery.status,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
