import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listScans, createScan, deleteScan } from "@/lib/screener-store";
import type { ScreenCondition } from "@/lib/indicators/screen";

const DIMENSIONS = ["campaign", "source", "medium", "landingPage"];
const METRICS = ["sessions", "conversions"];
const CONDITIONS: ScreenCondition[] = ["cusum", "pctBaseline", "crossover"];

function cleanConditions(input: unknown): ScreenCondition[] {
  if (!Array.isArray(input)) return [];
  return input.filter((c): c is ScreenCondition => CONDITIONS.includes(c as ScreenCondition));
}

function posNum(input: unknown, fallback: number): number {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    return NextResponse.json({ scans: await listScans(user.id) });
  } catch (err) {
    console.error("screener scans: list failed:", err);
    return NextResponse.json({ error: "Failed to load saved scans." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const dimension = typeof body.dimension === "string" ? body.dimension : "";
  const metric = typeof body.metric === "string" ? body.metric : "";
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
  if (!DIMENSIONS.includes(dimension)) {
    return NextResponse.json({ error: "Unknown dimension." }, { status: 400 });
  }
  if (!METRICS.includes(metric)) {
    return NextResponse.json({ error: "Unknown metric." }, { status: 400 });
  }

  try {
    const scan = await createScan(user.id, {
      name,
      dimension,
      metric,
      conditions: cleanConditions(body.conditions),
      threshold_pct: posNum(body.threshold_pct, 25),
      within_days: posNum(body.within_days, 14),
      min_volume: posNum(body.min_volume, 50),
    });
    return NextResponse.json({ scan });
  } catch (err) {
    console.error("screener scans: create failed:", err);
    return NextResponse.json({ error: "Failed to save scan." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  try {
    await deleteScan(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("screener scans: delete failed:", err);
    return NextResponse.json({ error: "Failed to delete scan." }, { status: 500 });
  }
}
