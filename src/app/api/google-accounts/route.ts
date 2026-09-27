import { forbidUnless, getAppUser } from "@/lib/team";
import { NextResponse } from "next/server";
import { getPlan, listGoogleAccounts } from "@/lib/google-accounts";
import { getAccessToken } from "@/lib/google-oauth";
import { listSites } from "@/lib/gsc";
import { PLAN_LIMITS } from "@/lib/plans";

type PropertySummary = { property?: string; displayName?: string };
type AccountSummary = { displayName?: string; propertySummaries?: PropertySummary[] };

// Every connected Google login with the GA4 properties and Search Console
// sites it can read (for the Add client wizard). Each login is read on its
// own, so one expired login doesn't hide the others.
export async function GET() {
  // Team roles: needs at least admin.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "admin") : null;
  if (denied) return denied;
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const [plan, accounts] = await Promise.all([getPlan(user.id), listGoogleAccounts(user.id).catch(() => null)]);
  if (!accounts) {
    return NextResponse.json({ error: "Couldn't read Google accounts. Has the latest migration been run?" }, { status: 500 });
  }
  const limits = PLAN_LIMITS[plan];

  const results = await Promise.all(
    accounts.map(async (a) => {
      try {
        const token = await getAccessToken(a.refresh_token);
        const [props, sites] = await Promise.all([
          fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (r) => (r.ok ? ((await r.json()).accountSummaries ?? []) as AccountSummary[] : [])),
          listSites(token).catch(() => []),
        ]);
        const properties = props.flatMap((acct) =>
          (acct.propertySummaries ?? []).map((p) => ({
            id: (p.property ?? "").replace("properties/", ""),
            name: p.displayName ?? p.property ?? "",
            account: acct.displayName ?? "",
          }))
        );
        return { id: a.id, email: a.email, properties, sites: sites.map((s) => s.siteUrl), error: null };
      } catch {
        return { id: a.id, email: a.email, properties: [], sites: [], error: "Google access expired. Reconnect this account." };
      }
    })
  );

  return NextResponse.json({
    plan,
    limits: { clients: Number.isFinite(limits.clients) ? limits.clients : null, googleAccounts: Number.isFinite(limits.googleAccounts) ? limits.googleAccounts : null },
    accounts: results,
  });
}
