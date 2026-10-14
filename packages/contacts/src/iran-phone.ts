/** Iranian mobile numbers, normalized to E.164 at every boundary. */
export function normalizeIranPhone(value: string): string | null {
  const digits = value
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
    )
    .replace(/[\s()-]/g, "");
  const national = digits.replace(/^(?:\+98|0098|98|0)/, "");
  return /^9\d{9}$/.test(national) ? `+98${national}` : null;
}

export function isPhoneIdentityEmail(
  email: string | null | undefined,
): boolean {
  return Boolean(email?.toLowerCase().endsWith("@phone.montask.invalid"));
}

export function realEmail(email: string | null | undefined): string | null {
  return email && !isPhoneIdentityEmail(email) ? email : null;
}
