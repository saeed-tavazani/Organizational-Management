import { normalizeIranPhone } from "@kaneo/libs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCaptcha } from "./auth-captcha";
import { useAuthCaptcha } from "./use-auth-captcha";

type Props = {
  withName?: boolean;
  changePhone?: boolean;
  defaultPhone?: string;
  onSuccess: () => void;
  disabled?: boolean;
};

export function PhoneCodeForm({
  withName = false,
  changePhone = false,
  defaultPhone = "",
  onSuccess,
  disabled,
}: Props) {
  const { t, i18n } = useTranslation();
  const captcha = useAuthCaptcha();
  const [phone, setPhone] = useState(defaultPhone);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);

  const send = async () => {
    const number = normalizeIranPhone(phone);
    if (!number) {
      setError(t("auth:phone.invalid"));
      return;
    }
    if (withName && !name.trim()) {
      setError(t("auth:forms.nameRequired"));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await authClient.phoneNumber.sendOtp(
        { phoneNumber: number },
        {
          headers: {
            ...captcha.headers,
            "x-phone-purpose": changePhone ? "change-phone" : "sign-in",
          },
        },
      );
      if (result.error) {
        setError(result.error.message || t("auth:phone.failed"));
        return;
      }
      setPhone(number);
      setSent(true);
      setResendAt(Date.now() + 60_000);
    } catch {
      setError(t("auth:phone.failed"));
    } finally {
      setPending(false);
      captcha.reset();
    }
  };

  const verify = async () => {
    setError(null);
    setPending(true);
    try {
      const result = await authClient.phoneNumber.verify({
        phoneNumber: phone,
        code,
        updatePhoneNumber: changePhone,
        ...(withName ? { name: name.trim(), locale: i18n.language } : {}),
      });
      if (result.error) {
        setError(result.error.message || t("auth:phone.failed"));
        return;
      }
      await authClient.getSession({ query: { disableCookieCache: true } });
      onSuccess();
    } catch {
      setError(t("auth:phone.failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void (sent ? verify() : send());
      }}
    >
      {withName && !sent ? (
        <label className="flex flex-col gap-2">
          <span>{t("auth:forms.name")}</span>
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-2">
        <span>{t("auth:phone.number")}</span>
        <Input
          dir="ltr"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09123456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          readOnly={sent}
          required
        />
      </label>
      {sent ? (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {t("auth:phone.sent")}
          </p>
          <label className="flex flex-col gap-2">
            <span>{t("auth:phone.code")}</span>
            <Input
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.replace(/[۰-۹٠-٩]/g, (digit) =>
                    String(
                      digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660),
                    ),
                  ),
                )
              }
              required
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {t("auth:phone.fallback")}
          </p>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!sent ? <AuthCaptcha captcha={captcha} /> : null}
      <Button
        type="submit"
        loading={pending}
        disabled={disabled || pending || (!sent && captcha.pending)}
      >
        {sent ? t("auth:phone.verify") : t("auth:phone.continue")}
      </Button>
      {sent ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            disabled={pending}
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
          >
            {t("auth:phone.change")}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={pending}
            onClick={() => {
              if (Date.now() < resendAt) {
                setError(t("auth:phone.wait"));
                return;
              }
              setSent(false);
              setCode("");
            }}
          >
            {t("auth:phone.resend")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
