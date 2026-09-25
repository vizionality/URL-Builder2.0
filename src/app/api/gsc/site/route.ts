import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection, setGscSite } from "@/lib/ga4-connection";

// Saves (or clears, with siteUrl null) the Search Console site for the SEO Dashboard.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const siteUrl = typeof body.siteUrl === "string" && body.siteUrl.trim() ? body.siteUrl.trim().slice(0, 500) : null;
  if (!(await getGa4Connection(user.id))) return NextResponse.json({ error: "Connect Google first." }, { status: 400 });
  try {
    await setGscSite(user.id, siteUrl);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't save. Has the Search Console migration been run?" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, siteUrl });
}
