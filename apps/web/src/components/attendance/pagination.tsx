import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
export function AttendancePagination({
  offset,
  total,
  onChange,
}: {
  offset: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  const { t } = useTranslation();
  if (total <= 30) return null;
  return (
    <div className="flex items-center justify-end gap-3 py-3 text-sm">
      <Button
        variant="outline"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - 30))}
      >
        {t("attendance:previous")}
      </Button>
      <span>
        {Math.floor(offset / 30) + 1} / {Math.ceil(total / 30)}
      </span>
      <Button
        variant="outline"
        disabled={offset + 30 >= total}
        onClick={() => onChange(offset + 30)}
      >
        {t("attendance:next")}
      </Button>
    </div>
  );
}
