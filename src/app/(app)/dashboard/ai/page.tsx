import { GaDashboard } from "@/components/dashboard/GaDashboard";

// The Google Analytics report limited to sessions from AI assistants.
export default function AiOverviewPage() {
  return <GaDashboard aiOnly />;
}
