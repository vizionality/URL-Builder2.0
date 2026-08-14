import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setGa4Property } from "@/lib/ga4-connection";

// Saves the selected GA4 property for the current user.
export async function POST(req: NextRequest) {
  const { propertyId, propertyName } = (await req.json()) as {
    propertyId?: string;
    propertyName?: string;
  };
  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await setGa4Property(user.id, String(propertyId), propertyName ?? null);
  return NextResponse.json({ ok: true });
}
