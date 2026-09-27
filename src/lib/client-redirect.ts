import { getAppUser } from "@/lib/team";
// Old, pre-client URLs (/dashboard, /integrations, ...) redirect to the same
// page for the last client this browser used, or the user's first client.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listClients } from "@/lib/clients";

export async function redirectToClient(
  path: string,
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<null> {
  const user = await getAppUser();
  if (!user) redirect("/sign-in");
  const clients = await listClients(user.id).catch(() => []);
  const last = (await cookies()).get("lastClient")?.value;
  const slug = clients.find((c) => c.slug === last)?.slug ?? clients[0]?.slug;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    for (const one of Array.isArray(v) ? v : v == null ? [] : [v]) qs.append(k, one);
  }
  const query = qs.toString();
  // No clients readable (e.g. the clients migration hasn't run): the caller
  // shows a notice rather than redirecting back here in a loop.
  if (!slug) return null;
  redirect(`/c/${slug}${path}${query ? `?${query}` : ""}`);
}
