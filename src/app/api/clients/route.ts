import { forbidUnless, getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import { createClientRecord, listClients } from "@/lib/clients";
import { getGoogleAccount, getPlan } from "@/lib/google-accounts";
import { canAddClient, PLAN_LIMITS } from "@/lib/plans";
import { atLeast } from "@/lib/roles";

// The signed-in user's clients (agency mode), and adding one.
export async function GET() {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const [clients, plan] = await Promise.all([listClients(user.id), getPlan(user.id)]);
    return NextResponse.json({
      plan,
      canAddClient: canAddClient(plan, clients.length) && atLeast(user.role, "admin"),
      clientLimit: Number.isFinite(PLAN_LIMITS[plan].clients) ? PLAN_LIMITS[plan].clients : null,
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
  // Team roles: needs at least admin.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "admin") : null;
  if (denied) return denied;
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const domain = str(body.domain);
  try {
    const [plan, existing] = await Promise.all([getPlan(user.id), listClients(user.id)]);
    if (!canAddClient(plan, existing.length)) {
      return NextResponse.json(
        { error: "Your Business plan includes one client. Upgrade to Agency to add more.", code: "plan_limit" },
        { status: 403 }
      );
    }
    // The Google logins must be this user's own.
    const account = await getGoogleAccount(user.id, str(body.googleAccountId));
    const gscAccount = await getGoogleAccount(user.id, str(body.gscGoogleAccountId));
    const c = await createClientRecord(user.id, name, {
      domain,
      google_account_id: account?.id ?? null,
      property_id: account ? str(body.propertyId, 40) : null,
      property_name: account ? str(body.propertyName) : null,
      gsc_google_account_id: gscAccount?.id ?? null,
      gsc_site_url: gscAccount ? str(body.gscSiteUrl, 500) : null,
    });
    return NextResponse.json({ client: { slug: c.slug, name: c.name } });
  } catch (err) {
    console.error("clients: create failed:", err);
    return NextResponse.json({ error: "Couldn't add the client." }, { status: 500 });
  }
}
