import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSite } from "@/lib/attribution/sites";
import { fetchReportRows } from "@/lib/attribution/store";
import { runReport } from "@/lib/attribution/engine";
import { MODEL_LABELS, type AttributionModel } from "@/lib/attribution/models";

const LOOKBACK_DAYS = 90;
const DAY_MS = 86_400_000;
const MODELS: AttributionModel[] = ["first", "last", "linear", "timeDecay", "positionBased"];

function isModel(v: string): v is AttributionModel {
  return (MODELS as string[]).includes(v);
}

function isoDay(value: string | null, fallback: Date): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const t = Date.parse(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return fallback.toISOString();
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id is required." }, { status: 400 });

  const modelParam = url.searchParams.get("model") ?? "linear";
  const model = isModel(modelParam) ? modelParam : "linear";

  const now = new Date();
  const endIso = isoDay(url.searchParams.get("endDate"), now);
  const startIso = isoDay(
    url.searchParams.get("startDate"),
    new Date(now.getTime() - 89 * DAY_MS)
  );
  const touchStartIso = new Date(Date.parse(startIso) - LOOKBACK_DAYS * DAY_MS).toISOString();

  // Ownership: the site must belong to the caller.
  let site;
  try {
    site = await getSite(user.id, siteId);
  } catch (err) {
    console.error("attribution report: getSite failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  try {
    const { touches, conversions, links } = await fetchReportRows(
      siteId,
      touchStartIso,
      startIso,
      endIso
    );
    const report = runReport(touches, conversions, links, model, {
      lookbackDays: LOOKBACK_DAYS,
    });
    return NextResponse.json({
      report,
      model,
      modelLabel: MODEL_LABELS[model],
      site: { id: site.id, name: site.name },
      range: { startDate: startIso.slice(0, 10), endDate: endIso.slice(0, 10) },
    });
  } catch (err) {
    console.error("attribution report: failed:", err);
    return NextResponse.json({ error: "Failed to build report." }, { status: 500 });
  }
}
