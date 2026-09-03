import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { acknowledgeSignal } from "@/lib/indicators/store";

// POST body: { metric, direction, firedOn }. Acknowledges one fired signal for
// the current user's currently selected property, so it stops nagging. The
// property is taken from the server-side connection, never from the client, so
// one user can never acknowledge into another user's or property's history.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conn = await getGa4Connection(user.id);
  if (!conn?.property_id) {
    return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });
  }

  let body: { metric?: string; direction?: string; firedOn?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { metric, direction, firedOn } = body;
  if (!metric || !direction || !firedOn) {
    return NextResponse.json(
      { error: "metric, direction and firedOn are required." },
      { status: 400 }
    );
  }
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction must be up or down." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firedOn)) {
    return NextResponse.json({ error: "firedOn must be yyyy-mm-dd." }, { status: 400 });
  }

  try {
    await acknowledgeSignal(user.id, conn.property_id, metric, direction, firedOn);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("signals ack failed:", err);
    return NextResponse.json({ error: "Could not acknowledge signal." }, { status: 500 });
  }
}
