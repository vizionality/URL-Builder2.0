import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClientRecord, listClients } from "@/lib/clients";

// The signed-in user's clients (agency mode), and adding one.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const clients = await listClients(user.id);
    return NextResponse.json({
      clients: clients.map((c) => ({
        slug: c.slug,
        name: c.name,
        domain: c.domain,
        propertyId: c.property_id,
        propertyName: c.property_name,
        gscSiteUrl: c.gsc_site_url,
      })),
    });
  } catch (err) {
    console.error("clients: list failed:", err);
    return NextResponse.json({ error: "Couldn't load clients. Has the clients migration been run?" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const domain = typeof body.domain === "string" && body.domain.trim() ? body.domain.trim().slice(0, 200) : null;
  try {
    const c = await createClientRecord(user.id, name, { domain });
    return NextResponse.json({ client: { slug: c.slug, name: c.name } });
  } catch (err) {
    console.error("clients: create failed:", err);
    return NextResponse.json({ error: "Couldn't add the client." }, { status: 500 });
  }
}
