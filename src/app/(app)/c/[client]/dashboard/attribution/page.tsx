import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { AttributionReport } from "@/components/dashboard/AttributionReport";

export default function AttributionPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Multi-touch attribution of leads and sales" />
      <DashboardTabs />
      <AttributionReport />
    </>
  );
}
