import { Header } from "@/components/Header";
import { BlankDashboard, DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default function SeoDashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="SEO Dashboard" />
      <DashboardTabs />
      <BlankDashboard name="SEO Dashboard" />
    </>
  );
}
