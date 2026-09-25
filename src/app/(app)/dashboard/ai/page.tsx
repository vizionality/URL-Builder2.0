import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { AiOverview } from "@/components/dashboard/AiOverview";

export default function AiOverviewPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="AI summary of Google Analytics and Search Console" />
      <DashboardTabs />
      <AiOverview />
    </>
  );
}
