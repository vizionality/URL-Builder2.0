import { redirectToClient } from "@/lib/client-redirect";

// Moved under /c/<client>/app; keeps old links and bookmarks working.
export default async function Redirect({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rest = [] } = await params;
  await redirectToClient(["/app", ...rest].join("/"), await searchParams);
  return (
    <main className="flex-1 px-4 py-10 text-sm text-zinc-600 sm:px-6">
      Clients couldn&apos;t be loaded. If you just updated the app, run the clients migration
      (supabase/migrations/20260928_clients.sql) in Supabase, then refresh.
    </main>
  );
}
