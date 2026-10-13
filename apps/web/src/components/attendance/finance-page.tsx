import { useTranslation } from "react-i18next";
import { useAttendanceProfile } from "@/hooks/queries/attendance/use-attendance";
import { AttendanceQueryState } from "./query-state";
import { AttendanceBankForm } from "./bank-form";
import { AttendanceRequestDialog } from "./request-dialog";
export function AttendanceFinancePage() {
  const { t, i18n } = useTranslation();
  const profile = useAttendanceProfile();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("attendance:myFinance")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("attendance:financeHint")}
        </p>
      </div>
      <AttendanceQueryState
        pending={profile.isPending}
        error={profile.isError}
        retry={() => profile.refetch()}
      />
      {profile.data && (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("attendance:hourlyRate")}
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                {profile.data.rate === null
                  ? t("attendance:rateUnknown")
                  : `${new Intl.NumberFormat(i18n.language).format(profile.data.rate)} ${t("attendance:currency")}`}
              </p>
            </div>
            <AttendanceRequestDialog kind="rate" />
          </section>
          <AttendanceBankForm
            key={JSON.stringify(profile.data.bank)}
            initial={profile.data.bank}
          />
        </>
      )}
    </div>
  );
}
