import { useTranslation } from "react-i18next";
import { useAttendanceProfile } from "@/hooks/queries/attendance/use-attendance";
import { AttendanceQueryState } from "./query-state";
import { AttendanceRequestDialog } from "./request-dialog";
import { AttendanceHistory } from "./history";
export function AttendanceEmployeeDetails({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const subject = useAttendanceProfile(userId);
  const { data: actor } = useAttendanceProfile();
  return (
    <div className="grid gap-4">
      <AttendanceQueryState
        pending={subject.isPending}
        error={subject.isError}
        retry={() => subject.refetch()}
      />
      {subject.data && (
        <>
          <p className="text-sm">
            {t("attendance:hourlyRate")}:{" "}
            {subject.data.rate === null
              ? "—"
              : `${new Intl.NumberFormat(i18n.language).format(subject.data.rate)} ${t("attendance:currency")}`}
          </p>
          {actor?.permissions.includes("rates") && actor.userId !== userId && (
            <AttendanceRequestDialog kind="rate" userId={userId} />
          )}
          {subject.data.bank && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-lg border border-border p-4 text-sm">
              {(["holder", "iban", "bank", "card", "account"] as const).map(
                (field) => (
                  <div className="contents" key={field}>
                    <dt className="text-muted-foreground">
                      {t(`attendance:bankFields.${field}`)}
                    </dt>
                    <dd
                      className="break-all"
                      dir={
                        field === "iban" ||
                        field === "card" ||
                        field === "account"
                          ? "ltr"
                          : undefined
                      }
                    >
                      {subject.data!.bank![field] || "—"}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          )}
        </>
      )}
      {actor?.permissions.includes("reports") && (
        <AttendanceHistory userId={userId} />
      )}
    </div>
  );
}
