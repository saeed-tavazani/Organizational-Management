import { useTranslation } from "react-i18next";
import { IntegrationCheckLine } from "@/components/project/integrations/panel/integration-check-line";
import { IntegrationPanel } from "@/components/project/integrations/panel/integration-panel";
import { IntegrationPanelSection } from "@/components/project/integrations/panel/integration-panel-section";
import { Button } from "@/components/ui/button";

type BaleLoadErrorProps = {
  retrying: boolean;
  onRetry: () => void;
};

export function BaleLoadError({ retrying, onRetry }: BaleLoadErrorProps) {
  const { t } = useTranslation();

  return (
    <IntegrationPanel>
      <IntegrationPanelSection>
        <IntegrationCheckLine
          action={
            <Button
              disabled={retrying}
              onClick={onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("settings:chatIntegrations.retry")}
            </Button>
          }
          tone="destructive"
        >
          {t("settings:baleIntegration.loadError")}
        </IntegrationCheckLine>
      </IntegrationPanelSection>
    </IntegrationPanel>
  );
}
