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
  } catch {
    return NextResponse.json(
      { email: null, error: "GA4_SA_KEY is not valid JSON or base64." },
      { status: 200 }
    );
  }
}
