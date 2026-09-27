import type { Metadata } from "next";
import { getClientBySlug } from "@/lib/clients";
import { getShareByToken, isUnlocked } from "@/lib/portal";
import { PortalPassword, PortalView } from "@/components/portal/PortalView";

export const metadata: Metadata = { title: "Client dashboard", robots: { index: false, follow: false } };

// Read-only client portal: one client's dashboards through a share link, no account.
export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getShareByToken(token);
  const client = share ? await getClientBySlug(share.user_id, share.client_slug).catch(() => null) : null;
  if (!share || !client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-zinc-900">This link isn&apos;t active</p>
          <p className="mt-1 text-sm text-zinc-500">It may have been turned off. Ask your agency for a new link.</p>
        </div>
      </main>
    );
  }
  if (!(await isUnlocked(share))) return <PortalPassword token={token} clientName={client.name} />;
  return <PortalView token={token} clientName={client.name} hasSearchConsole={Boolean(client.gsc_site_url)} />;
}
