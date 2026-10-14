import { useLocation, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Timer } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function PanelSwitcher() {
  const { t } = useTranslation();
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const attendance = pathname.startsWith("/attendance");
  const key = `kaneo-panels:${data?.user.id}`;
  useEffect(() => {
    if (pathname.startsWith("/dashboard/settings")) return;
    if (
      pathname.startsWith("/attendance") ||
      pathname.startsWith("/dashboard")
    ) {
      try {
        sessionStorage.setItem(
          `${key}:${attendance ? "attendance" : "tasks"}`,
          pathname,
        );
      } catch {
        /* Private browsing may disable storage. */
      }
    }
  }, [pathname, attendance, key]);
  function change(panel: "tasks" | "attendance") {
    const prefix = panel === "tasks" ? "/dashboard" : "/attendance";
    let target = prefix;
    try {
      const saved = sessionStorage.getItem(`${key}:${panel}`);
      if (saved?.startsWith(`${prefix}/`) || saved === prefix) target = saved;
    } catch {
      /* Use the panel landing page. */
    }
    void navigate({ to: target });
  }
  return (
    <nav
      aria-label={t("attendance:panels")}
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      <Button
        variant={attendance ? "ghost" : "secondary"}
        aria-current={!attendance ? "page" : undefined}
        className="min-w-0 px-1"
        onClick={() => change("tasks")}
        size={"xs"}
      >
        <ClipboardList aria-hidden="true" />
        <span>{t("attendance:tasksPanel")}</span>
      </Button>
      <Button
        variant={attendance ? "secondary" : "ghost"}
        aria-current={attendance ? "page" : undefined}
        className="min-w-0 px-1"
        onClick={() => change("attendance")}
        size={"xs"}
      >
        <Timer aria-hidden="true" />
        <span>{t("attendance:title")}</span>
      </Button>
    </nav>
  );
}
