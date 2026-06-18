import { NextResponse } from "next/server";

export async function GET() {
  const saKey = process.env.GA4_SA_KEY;
  if (!saKey) {
    return NextResponse.json(
      { email: null, error: "GA4 service account is not configured on the server." },
      { status: 200 }
    );
  }

  try {
    const parsed = JSON.parse(saKey);
    if (!parsed.client_email) {
      return NextResponse.json(
        { email: null, error: "GA4_SA_KEY is missing a client_email field." },
        { status: 200 }
      );
    }
    return NextResponse.json({ email: parsed.client_email });
  } catch {
    return NextResponse.json(
      { email: null, error: "GA4_SA_KEY is not valid JSON." },
      { status: 200 }
    );
  }
}
