import { NextRequest, NextResponse } from "next/server";

function toSnakeCase(line: string): string {
  return line
    .replace(/^[-*\d.)\s]+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(req: NextRequest) {
  const { description } = await req.json();

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "description is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI suggestions are not configured on the server." },
      { status: 501 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Suggest 3-5 short marketing campaign initiative names for this description, formatted as snake_case (lowercase words separated by underscores, no special characters). Respond with ONLY the names, one per line, nothing else.\n\nDescription: ${description.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${text}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";
    const suggestions = text
      .split("\n")
      .map(toSnakeCase)
      .filter(Boolean)
      .slice(0, 5);

    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate suggestions." },
      { status: 500 }
    );
  }
}
