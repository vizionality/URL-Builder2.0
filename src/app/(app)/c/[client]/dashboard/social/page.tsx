import { Header } from "@/components/Header";
import { BlankDashboard, DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default function SocialDashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Social Media" />
      <DashboardTabs />
      <BlankDashboard name="Social Media" />
    </>
  );
}
