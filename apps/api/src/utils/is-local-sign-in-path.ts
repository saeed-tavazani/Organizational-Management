const localSignInPaths = new Set([
  "/sign-in/email",
  "/phone-number/send-otp",
  "/phone-number/verify",
  "/request-password-reset",
  "/reset-password",
  "/sign-in/magic-link",
  "/magic-link/verify",
  "/sign-in/email-otp",
]);

export function isLocalSignInPath(path: string) {
  return (
    localSignInPaths.has(path) ||
    path.startsWith("/email-otp/") ||
    path.startsWith("/reset-password/")
  );
}
