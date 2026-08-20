import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSharedProject } from "@/lib/shared-projects";
import type { BulkRow } from "@/lib/types";

const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, rows } = body ?? {};
  if (!name || typeof name !== "string" || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "name and rows are required." },
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

  // Only persist the expected fields — never trust the client's shape.
  const clean: BulkRow[] = rows.slice(0, MAX_ROWS).map((r) => ({
    id: String(r?.id ?? crypto.randomUUID()),
    baseUrl: String(r?.baseUrl ?? ""),
    source: String(r?.source ?? ""),
    medium: String(r?.medium ?? ""),
    campaign: String(r?.campaign ?? ""),
    generatedUrl: String(r?.generatedUrl ?? ""),
  }));

  try {
    const id = await createSharedProject(user.id, name.slice(0, 120), clean);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Failed to create shared project:", err);
    return NextResponse.json(
      { error: "Failed to create share link." },
      { status: 500 }
    );
  }
}
