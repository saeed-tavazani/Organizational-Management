import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { decideAttendanceRequest } from "@/fetchers/attendance";
import { useAttendanceMutation } from "@/hooks/mutations/attendance/use-attendance-mutation";
import {
  useAttendanceSettings,
  useAttendanceProfile,
  useAttendanceRequests,
} from "@/hooks/queries/attendance/use-attendance";
import { AttendanceRequestDialog } from "./request-dialog";
import { AttendanceQueryState } from "./query-state";
import { AttendancePagination } from "./pagination";

export function AttendanceRequestsPage({
  personal = false,
}: {
  personal?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useAttendanceSettings();
  const { data: session } = authClient.useSession();
  const { data: profile } = useAttendanceProfile();
  const [offset, setOffset] = useState(0);
  const query = useAttendanceRequests(
    offset,
    personal ? session?.user.id : undefined,
  );
  const decide = useAttendanceMutation(
    ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected" | "cancelled";
    }) => decideAttendanceRequest(id, decision),
  );
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      timeZone: settings?.policy.timeZone ?? "Asia/Tehran",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {t(personal ? "attendance:leaves" : "attendance:requests")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("attendance:approvalHint")}
          </p>
        </div>
        {personal && <AttendanceRequestDialog kind="leave" />}
      </div>
      <AttendanceQueryState
        pending={query.isPending}
        error={query.isError}
        retry={() => query.refetch()}
      />
      <div className="grid gap-3">
        {query.data?.requests.map((request) => {
          const p = request.payload;
          const permission =
            p.kind === "rate"
              ? "rates"
              : p.kind === "leave" || p.kind === "cancel"
                ? "leave"
                : "corrections";
          const own = request.userId === session?.user.id;
          const canDecide = !own && profile?.permissions.includes(permission);
          return (
            <article
              key={request.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">
                    {t(`attendance:requestKinds.${p.kind}`)} ·{" "}
                    {request.userName}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {date(request.createdAt)}
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  {t(`attendance:statuses.${request.status}`)}
                </span>
              </div>
              {(p.kind === "leave" || p.kind === "correction") && (
                <p className="mt-3 text-sm">
                  {date(p.startTime)} — {date(p.endTime)}
                  {p.kind === "leave" && ` · ${t(`attendance:${p.mode}`)}`}
                  {p.kind === "correction" &&
                    p.remove &&
                    ` · ${t("attendance:requestRemoval")}`}
                </p>
              )}
              {p.kind === "rate" && (
                <p className="mt-3 text-sm">
                  {new Intl.NumberFormat(i18n.language).format(p.amount)}{" "}
                  {t("attendance:currency")}
                </p>
              )}
              {(p.kind === "review" || p.kind === "correction") &&
                p.entryId && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("attendance:entryReference", { id: p.entryId })}
                  </p>
                )}
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {request.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {request.status === "pending" && own && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ id: request.id, decision: "cancelled" })
                    }
                  >
                    {t("attendance:withdraw")}
                  </Button>
                )}
                {request.status === "pending" && canDecide && (
                  <>
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ id: request.id, decision: "approved" })
                      }
                    >
                      {t("attendance:approve")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ id: request.id, decision: "rejected" })
                      }
                    >
                      {t("attendance:reject")}
                    </Button>
                  </>
                )}
                {request.status === "approved" && own && p.kind === "leave" && (
                  <AttendanceRequestDialog
                    kind="cancel"
                    requestId={request.id}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
      {query.data && !query.data.requests.length && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("attendance:noRequests")}
        </p>
      )}
      <AttendancePagination
        offset={offset}
        total={query.data?.total ?? 0}
        onChange={setOffset}
      />
    </div>
  );
}
