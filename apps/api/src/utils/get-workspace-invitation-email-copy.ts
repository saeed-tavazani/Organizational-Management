import enUS from "../../../../i18n/en-US.json";
import faIR from "../../../../i18n/fa-IR.json";

const bundles = {
  en: enUS,
  fa: faIR,
} as const;

function getBundle(locale?: string | null) {
  const normalizedLocale = locale?.toLowerCase();

  if (normalizedLocale?.startsWith("fa")) return bundles.fa;

  return bundles.en;
}

export function getWorkspaceInvitationEmailCopy(locale?: string | null) {
  return getBundle(locale).invitations.email;
}

export function getInvitationRoleLabel(locale: string | null, role: string) {
  const labels: Record<string, string> = getBundle(locale).team.roles;

  return role
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => (Object.hasOwn(labels, name) ? labels[name] : name))
    .join(", ");
}
