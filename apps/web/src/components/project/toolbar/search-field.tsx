import { Search, X } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type SearchFieldProps = {
  ref?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  onBlur?: () => void;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SearchField({
  ref,
  autoFocus,
  onBlur,
  value,
  onChange,
  className,
}: SearchFieldProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative items-center", className)}>
      <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 start-2.5 z-10 size-3.5 text-muted-foreground" />
      <Input
        ref={ref}
        autoFocus={autoFocus}
        type="search"
        value={value}
        maxLength={256}
        aria-label={t("tasks:toolbar.search")}
        placeholder={t("tasks:toolbar.search")}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          if (value) {
            onChange("");
          } else {
            event.currentTarget.blur();
          }
        }}
        className="[&_[data-slot=input]]:h-7 [&_[data-slot=input]]:pe-7 [&_[data-slot=input]]:ps-8 [&_[data-slot=input]]:text-[13px] [&_[data-slot=input]]:leading-7"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("tasks:toolbar.clearSearch")}
          onClick={() => onChange("")}
          className="-translate-y-1/2 absolute top-1/2 end-0.5 sm:size-6"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
