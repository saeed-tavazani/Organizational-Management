import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheck,
  CreditCard,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAttendanceProfile } from "@/hooks/queries/attendance/use-attendance";
export function AttendanceNav() {
  const { t } = useTranslation();
  const { data } = useAttendanceProfile();
  const navigate = useNavigate();
  const pathname = useLocation({
    select: (l) => l.pathname.replace(/\/$/, ""),
  });
  const items = [
    { path: "/attendance", label: "tracker", icon: Timer },
    {
      path: "/attendance/reports",
      label: "myReports",
      icon: ChartNoAxesCombined,
    },
    { path: "/attendance/leaves", label: "leaves", icon: CalendarDays },
    { path: "/attendance/finance", label: "myFinance", icon: CreditCard },
    ...(data?.permissions.length
      ? [{ path: "/attendance/employees", label: "employees", icon: Users }]
      : []),
    ...(data?.permissions.some((p) =>
      ["leave", "corrections", "rates"].includes(p),
    )
      ? [{ path: "/attendance/requests", label: "requests", icon: CircleCheck }]
      : []),
    ...(data?.role === "admin"
      ? [
          {
            path: "/dashboard/settings/admin/attendance",
            label: "settings",
            icon: Settings,
          },
        ]
      : []),
  ];
  return (
    <SidebarGroup className="p-2">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={pathname === item.path}
                onClick={() => navigate({ to: item.path })}
                className="h-8"
              >
                <item.icon aria-hidden="true" />
                <span>{t(`attendance:${item.label}`)}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
