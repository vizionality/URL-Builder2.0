import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { SeoDashboard } from "@/components/dashboard/SeoDashboard";

export default function SeoDashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Google Search Console performance" />
      <DashboardTabs />
      <SeoDashboard />
    </>
  );
}
