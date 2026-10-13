import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Layout from "@/components/common/layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import PageTitle from "@/components/page-title";
export function AttendanceShell() {
  const { t } = useTranslation();
  return (
    <Layout>
      <PageTitle title={t("attendance:title")} />
      <Layout.Header>
        <SidebarTrigger />
        <span className="flex items-center text-sm font-medium">
          {t("attendance:title")}
        </span>
        <span className="ms-auto flex items-center text-xs text-muted-foreground">
          {t("attendance:companyWide")}
        </span>
      </Layout.Header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </Layout>
  );
}
