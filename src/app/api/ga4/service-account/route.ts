import { NextResponse } from "next/server";
import { parseServiceAccountKey } from "@/lib/ga4-credentials";

export async function GET() {
  const saKey = process.env.GA4_SA_KEY;
  if (!saKey) {
    return NextResponse.json(
      { email: null, error: "GA4 service account is not configured on the server." },
      { status: 200 }
    );
  }

  // Non-sensitive diagnostics: shape of the stored value + why parsing failed.
  // No part of the private key is exposed (only length and the first character).
  const trimmed = saKey.trim();
  const debug = {
    rawLength: saKey.length,
    firstChar: trimmed.slice(0, 1),
    looksLikeJson: trimmed.startsWith("{"),
  };

  try {
    const parsed = parseServiceAccountKey(saKey);
    if (!parsed.client_email) {
      return NextResponse.json(
        { email: null, error: "GA4_SA_KEY is missing a client_email field.", debug },
        { status: 200 }
      );
    }
    return NextResponse.json({ email: parsed.client_email });
  } catch (err) {
    return NextResponse.json(
      {
        email: null,
        error: "GA4_SA_KEY is not valid JSON or base64.",
        debug: {
          ...debug,
          parseError: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 200 }
    );
  }
}
