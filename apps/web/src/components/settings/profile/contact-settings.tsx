import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { PhoneCodeForm } from "@/components/auth/phone-code-form";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import {
  sendContactEmail,
  verifyContactEmail,
  removeContactEmail,
} from "@/fetchers/user/contact";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";

export function ContactSettings() {
  const { t } = useTranslation();
  const { user, refetchUser } = useAuth();
  const { data: config } = useGetConfig();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      if (sent) await verifyContactEmail(code);
      else await sendContactEmail(email);
    },
    onSuccess: () => {
      if (sent) {
        setSent(false);
        setEmail("");
        setCode("");
        void refetchUser();
      } else setSent(true);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (kind: "email" | "phone") => {
      if (kind === "email") await removeContactEmail();
      else {
        const result = await authClient.updateUser({ phoneNumber: null });
        if (result.error) throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      void refetchUser();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <SettingsSection title={t("auth:phone.contacts")}>
      <SettingsCard className="space-y-4 p-4">
        {config?.hasBale ? (
          <PhoneCodeForm
            changePhone
            onSuccess={() => {
              void refetchUser();
            }}
            defaultPhone={user?.phoneNumber ?? ""}
          />
        ) : (
          <p>{t("auth:phone.unavailable")}</p>
        )}
        {user?.phoneNumber ? (
          <Button
            variant="outline"
            disabled={remove.isPending || !user.emailVerified || !user.email}
            onClick={() => remove.mutate("phone")}
          >
            {t("auth:phone.removePhone")}
          </Button>
        ) : null}
        {config?.hasSmtp ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <label className="flex flex-col gap-2">
              <span>{t("auth:forms.email")}</span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={sent}
              />
            </label>
            {sent ? (
              <label className="flex flex-col gap-2">
                <span>{t("auth:phone.code")}</span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  pattern="[0-9]{6}"
                />
              </label>
            ) : null}
            <Button type="submit" loading={mutation.isPending}>
              {sent ? t("auth:phone.verify") : t("auth:phone.verifyEmail")}
            </Button>
            {sent ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSent(false)}
              >
                {t("auth:phone.change")}
              </Button>
            ) : null}
          </form>
        ) : null}
        {user?.email ? (
          <Button
            variant="outline"
            disabled={remove.isPending || !user.phoneNumberVerified}
            onClick={() => remove.mutate("email")}
          >
            {t("auth:phone.removeEmail")}
          </Button>
        ) : null}
      </SettingsCard>
    </SettingsSection>
  );
}
