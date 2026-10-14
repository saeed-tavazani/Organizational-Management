import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AdminUser } from "@/hooks/queries/admin/use-admin-users";
import { ADMIN_USERS_QUERY_KEY } from "@/hooks/queries/admin/use-admin-users";
import { recoverPhone } from "@/fetchers/admin/recover-phone";
import { toast } from "@/lib/toast";

export function RecoverPhoneDialog({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      if (user) await recoverPhone(user.id, phoneNumber);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      setPhoneNumber("");
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          setPhoneNumber("");
          onClose();
        }
      }}
    >
      <DialogPopup>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("auth:phone.recover")}</DialogTitle>
            <DialogDescription>
              {t("auth:phone.recoverDescription", { name: user?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <label className="flex flex-col gap-2">
              <span>{t("auth:phone.number")}</span>
              <Input
                type="tel"
                autoComplete="tel"
                dir="ltr"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </label>
          </DialogPanel>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setPhoneNumber("");
                onClose();
              }}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {t("auth:phone.recover")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
