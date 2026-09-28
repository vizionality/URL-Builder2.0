import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { BotDetection } from "@/components/dashboard/BotDetection";

export default function BotDetectionPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Bot detection: traffic that looks automated" />
      <DashboardTabs />
      <BotDetection />
    </>
  );
}
