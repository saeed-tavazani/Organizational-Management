import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
export function useAttendanceMutation<T, R>(
  mutationFn: (value: T) => Promise<R>,
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: () => {
      toast.error(t("attendance:errors.save"));
    },
  });
}
