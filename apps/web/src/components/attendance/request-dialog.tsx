import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
} from "@/components/ui/dialog";
import type {
  AttendanceEntry,
  AttendanceRequestInput,
} from "@/fetchers/attendance";
import { AttendanceRequestForm } from "./request-form";
export function AttendanceRequestDialog({
  kind,
  entry,
  requestId,
  userId,
}: {
  kind: AttendanceRequestInput["payload"]["kind"];
  entry?: AttendanceEntry;
  requestId?: string;
  userId?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const title = t(`attendance:requestKinds.${kind}`);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {title}
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("attendance:approvalHint")}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {open && (
            <AttendanceRequestForm
              kind={kind}
              entry={entry}
              requestId={requestId}
              userId={userId}
              onSaved={() => setOpen(false)}
            />
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
