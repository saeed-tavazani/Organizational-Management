import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export function AttendanceDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : undefined;
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="justify-between"
              aria-label={label}
            />
          }
        >
          <span>
            {date
              ? new Intl.DateTimeFormat(i18n.language, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(date)
              : "—"}
          </span>
          <CalendarDays aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(selected) => {
              if (!selected) return;
              onChange(
                `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`,
              );
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
