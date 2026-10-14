export function isContactConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; cause?: unknown };
  return (
    value.code === "23505" ||
    (value.cause !== error &&
      Boolean(value.cause) &&
      isContactConflict(value.cause))
  );
}
