import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientBySlug, listClients } from "@/lib/clients";
import { ClientScope } from "@/components/clients/ClientScope";

// Client-scoped pages (/c/<slug>/...): only the signed-in user's own clients.
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const record = await getClientBySlug(user.id, client).catch(() => null);
  if (!record) notFound();
  const [oldest] = await listClients(user.id).catch(() => []);
  return (
    <ClientScope slug={record.slug} legacyOwner={oldest?.slug === record.slug}>
      {children}
    </ClientScope>
  );
}
