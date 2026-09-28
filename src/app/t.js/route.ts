import { createAdminClient } from "@/lib/supabase/admin";
import { trackerScript } from "@/lib/tracker-script";

// The tracking script behind the one-line GTM snippet:
// <script async src="https://<app>/t.js?k=KEY"></script>
const DEFAULT_EVENTS = ["generate_lead", "purchase"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("k") ?? "";
  const headers = {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": "public, max-age=300",
    "access-control-allow-origin": "*",
  };
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) return new Response("/* invalid tracking key */", { headers });
  const { data } = await createAdminClient()
    .from("clients")
    .select("conversion_events")
    .eq("tracking_key", key)
    .maybeSingle()
    .then((r) => r, () => ({ data: null }));
  if (!data) return new Response("/* unknown tracking key */", { headers });
  const extra = ((data.conversion_events as string[] | null) ?? []).filter((e) => /^[A-Za-z0-9_]{1,40}$/.test(e));
  const body = trackerScript({ key, endpoint: `${url.origin}/api/collect`, events: [...new Set([...DEFAULT_EVENTS, ...extra])] });
  return new Response(body, { headers });
}
