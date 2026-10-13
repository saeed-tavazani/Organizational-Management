import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
export function AttendanceQueryState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!pending && !error) return null;
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
      role={error ? "alert" : "status"}
    >
      {t(pending ? "attendance:loading" : "attendance:errors.load")}
      {error && (
        <Button variant="outline" onClick={() => retry()}>
          {t("attendance:retry")}
        </Button>
      )}
    </div>
  );
}
