import type { EmailLocale } from "../templates/resolve-locale";

type Reason = (email: string, instance?: string) => string;

export const signInReason: Record<EmailLocale, Reason> = {
  en: (email, instance = "Montask") =>
    `Sent to ${email} because someone asked to sign in to ${instance}.`,
  fa: (email, instance = "Montask") =>
    `این ایمیل به ${email} فرستاده شد، چون شخصی درخواست ورود به ${instance} را داده است.`,
};

export const passwordResetReason: Record<EmailLocale, Reason> = {
  en: (email, instance = "Montask") =>
    `Sent to ${email} because someone asked to reset the password on ${instance}.`,
  fa: (email, instance = "Montask") =>
    `این ایمیل به ${email} فرستاده شد، چون شخصی درخواست بازنشانی گذرواژه در ${instance} را داده است.`,
};
