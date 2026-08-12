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

  try {
    const parsed = parseServiceAccountKey(saKey);
    if (!parsed.client_email) {
      return NextResponse.json(
        { email: null, error: "GA4_SA_KEY is missing a client_email field." },
        { status: 200 }
      );
    }
    return NextResponse.json({ email: parsed.client_email });
  } catch (err) {
    // Log details server-side only; never echo parse errors (they can embed
    // fragments of the decoded key material) to the client.
    console.error("Failed to parse GA4_SA_KEY:", err);
    return NextResponse.json(
      { email: null, error: "GA4_SA_KEY is not valid JSON or base64." },
      { status: 200 }
    );
  }
}
