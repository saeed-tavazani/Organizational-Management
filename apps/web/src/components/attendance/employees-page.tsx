import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  putAttendanceRole,
  type AttendanceEmployee,
} from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
import {
  useAttendanceEmployees,
  useAttendanceProfile,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceQueryState } from "./query-state";
import { AttendancePagination } from "./pagination";
import { AttendanceSelect } from "./select-field";
import { AttendanceEmployeeDetails } from "./employee-details";
export function AttendanceEmployeesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AttendanceEmployee | null>(null);
  const query = useAttendanceEmployees(offset);
  const { data: actor } = useAttendanceProfile();
  const role = useAttendanceMutation(
    ({
      userId,
      value,
    }: {
      userId: string;
      value: "employee" | "hr" | "finance";
    }) => putAttendanceRole(userId, value),
  );
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("attendance:employees")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("attendance:employeesHint")}
        </p>
      </div>
      <AttendanceQueryState
        pending={query.isPending}
        error={query.isError}
        retry={() => query.refetch()}
      />
      {query.data && (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("attendance:employee")}</TableHead>
                <TableHead>{t("attendance:role")}</TableHead>
                <TableHead>{t("attendance:actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    {actor?.role === "admin" && user.role !== "admin" ? (
                      <AttendanceSelect
                        label={t("attendance:role")}
                        value={user.role}
                        disabled={role.isPending}
                        onChange={(value) =>
                          role.mutate({
                            userId: user.userId,
                            value: value as "employee" | "hr" | "finance",
                          })
                        }
                        options={["employee", "hr", "finance"].map((value) => ({
                          value,
                          label: t(`attendance:roles.${value}`),
                        }))}
                      />
                    ) : (
                      t(`attendance:roles.${user.role}`)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {actor?.permissions.includes("reports") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/attendance/reports",
                              search: { userId: user.userId },
                            })
                          }
                        >
                          {t("attendance:myReports")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(user)}
                      >
                        {t("attendance:details")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AttendancePagination
        offset={offset}
        total={query.data?.total ?? 0}
        onChange={setOffset}
      />
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {t("attendance:employeeDetailsHint")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {selected && <AttendanceEmployeeDetails userId={selected.userId} />}
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
