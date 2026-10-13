import { useLocation } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect } from "react";

import { AttendanceNav } from "@/components/attendance/nav";
import { PanelSwitcher } from "@/components/attendance/panel-switcher";
import { AttendanceTimerIndicator } from "@/components/attendance/timer-indicator";
import { useTranslation } from "react-i18next";
import { Timer } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import { TrialCard } from "@/components/trial-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version-display";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslation();
  const pathname = useLocation({ select: (location) => location.pathname });

  // Navigation that doesn't start from a sidebar link (creating a project,
  // the command palette) must still dismiss the mobile drawer.
  useEffect(() => {
    if (pathname) setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none"
      {...props}
    >
      <SidebarHeader className="pt-1 pb-1.5">
        {pathname.startsWith("/attendance") ? (
          <div className="flex h-10 items-center gap-2 px-2 text-sm font-semibold">
            <Timer aria-hidden="true" className="size-5" />
            {t("attendance:title")}
          </div>
        ) : (
          <WorkspaceSwitcher />
        )}
      </SidebarHeader>
      <SidebarContent className="overflow-hidden gap-1 py-1">
        {pathname.startsWith("/attendance") ? (
          <AttendanceNav />
        ) : (
          <>
            <NavMain />
            <NavProjects />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <AttendanceTimerIndicator />
        <PanelSwitcher />
        <NavSecondary />
        <TrialCard />
        <div className="flex items-center justify-between">
          <VersionDisplay />
          <ThemeToggleDropdown />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
