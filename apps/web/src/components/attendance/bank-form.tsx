import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { putAttendanceBank, type AttendanceBank } from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
export function AttendanceBankForm({
  initial,
}: {
  initial: AttendanceBank | null;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<AttendanceBank>(
    initial ?? { holder: "", iban: "", bank: "", card: "", account: "" },
  );
  const mutation = useAttendanceMutation(
    putAttendanceBank,
    t("attendance:saved"),
  );
  const fields = ["holder", "iban", "bank", "card", "account"] as const;
  return (
    <form
      className="grid gap-4 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(values);
      }}
    >
      <h2 className="font-semibold">{t("attendance:bankDetails")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label className="grid gap-2 text-sm" key={field}>
            {t(`attendance:bankFields.${field}`)}
            <Input
              value={values[field]}
              required={field === "holder" || field === "iban"}
              maxLength={
                field === "card"
                  ? 16
                  : field === "account"
                    ? 30
                    : field === "iban"
                      ? 26
                      : 150
              }
              dir={
                field === "iban" || field === "card" || field === "account"
                  ? "ltr"
                  : undefined
              }
              inputMode={
                field === "card" || field === "account" ? "numeric" : undefined
              }
              pattern={
                field === "iban"
                  ? "[Ii][Rr][0-9]{24}"
                  : field === "card"
                    ? "[0-9]{16}"
                    : field === "account"
                      ? "[0-9]{1,30}"
                      : undefined
              }
              onChange={(e) =>
                setValues({ ...values, [field]: e.target.value })
              }
            />
          </label>
        ))}
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("attendance:errors.bank")}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("attendance:saved")}
        </p>
      )}
      <Button
        type="submit"
        className="justify-self-start"
        loading={mutation.isPending}
        disabled={mutation.isPending}
      >
        {t("attendance:save")}
      </Button>
    </form>
  );
}
