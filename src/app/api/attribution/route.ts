import { NextRequest, NextResponse } from "next/server";
import { getAppUser } from "@/lib/team";
import { clientParam, getClientBySlug } from "@/lib/clients";
import { attribute, type Touch } from "@/lib/attribution";
import { bigQueryConfigured, DATASET, query } from "@/lib/bigquery";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONVERSIONS = 20_000;
const DAY = 86_400_000;

// Attribution report from the tracker's data in BigQuery. Two queries:
// 1. Each conversion in the range with the visitor's touches in the lookback
//    (credited under every model in lib/attribution.ts).
// 2. First-touch acquisition: visitors whose first ever touch falls in the
//    range, by channel, and how many of them converted and how fast.
// Every query filters on account + client (clustered) and a ts range (partitioned).
export async function GET(req: NextRequest) {
  const me = await getAppUser();
  if (!me) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const client = await getClientBySlug(me.id, clientParam(req)).catch(() => null);
  if (!client) return NextResponse.json({ error: "Unknown client." }, { status: 404 });
  if (!bigQueryConfigured()) {
    return NextResponse.json({ error: "Attribution storage isn't set up yet (BIGQUERY_SA_KEY).", code: "no_bigquery" }, { status: 501 });
  }
  const q = req.nextUrl.searchParams;
  const startDate = q.get("startDate") ?? "";
  const endDate = q.get("endDate") ?? "";
  if (!ISO.test(startDate) || !ISO.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }
  const lookback = [7, 30, 60, 90].includes(Number(q.get("lookback"))) ? Number(q.get("lookback")) : 30;
  const events = (q.get("events") ?? "").split(",").filter((e) => /^[A-Za-z0-9_]{1,40}$/.test(e)).join(",");
  const start = `${startDate}T00:00:00Z`;
  const end = `${endDate}T23:59:59.999Z`;
  const T = (t: string) => `\`${DATASET}.${t}\``;
  const params = [
    { name: "owner", type: "STRING" as const, value: me.id },
    { name: "slug", type: "STRING" as const, value: client.slug },
    { name: "start", type: "TIMESTAMP" as const, value: start },
    { name: "end", type: "TIMESTAMP" as const, value: end },
    { name: "from", type: "TIMESTAMP" as const, value: new Date(Date.parse(start) - lookback * DAY).toISOString() },
    { name: "history", type: "TIMESTAMP" as const, value: new Date(Date.parse(end) - 730 * DAY).toISOString() },
    { name: "lookback", type: "INT64" as const, value: lookback },
    { name: "events", type: "STRING" as const, value: events },
  ];

  const pathsSql = `
    WITH conv AS (
      SELECT * EXCEPT (rn) FROM (
        SELECT conversion_id, visitor_id, ts, event_name, value,
          ROW_NUMBER() OVER (PARTITION BY COALESCE(transaction_id, conversion_id) ORDER BY ts) AS rn
        FROM ${T("conversions")}
        WHERE owner_id = @owner AND client_slug = @slug AND ts BETWEEN @start AND @end
          AND (@events = '' OR event_name IN UNNEST(SPLIT(@events, ',')))
      ) WHERE rn = 1
      ORDER BY ts
      LIMIT ${MAX_CONVERSIONS}
    ),
    t AS (
      SELECT visitor_id, ts, source, medium, campaign FROM ${T("touches")}
      WHERE owner_id = @owner AND client_slug = @slug AND ts BETWEEN @from AND @end
        AND visitor_id IN (SELECT visitor_id FROM conv)
    )
    SELECT c.conversion_id, ANY_VALUE(c.visitor_id) AS visitor_id, ANY_VALUE(c.ts) AS ts,
      ANY_VALUE(c.event_name) AS event_name, ANY_VALUE(c.value) AS value,
      ARRAY_AGG(IF(t.ts IS NULL, NULL, STRUCT(t.ts AS ts, t.source AS source, t.medium AS medium, t.campaign AS campaign))
        IGNORE NULLS ORDER BY t.ts DESC LIMIT 50) AS path
    FROM conv c
    LEFT JOIN t ON t.visitor_id = c.visitor_id
      AND t.ts BETWEEN TIMESTAMP_SUB(c.ts, INTERVAL @lookback DAY) AND c.ts
    GROUP BY c.conversion_id`;

  const acquisitionSql = `
    WITH first AS (
      SELECT visitor_id, ARRAY_AGG(STRUCT(ts, source, medium) ORDER BY ts LIMIT 1)[OFFSET(0)] AS f
      FROM ${T("touches")}
      WHERE owner_id = @owner AND client_slug = @slug AND ts BETWEEN @history AND @end
      GROUP BY visitor_id
    ),
    conv AS (
      SELECT visitor_id, MIN(ts) AS first_conversion FROM ${T("conversions")}
      WHERE owner_id = @owner AND client_slug = @slug AND ts BETWEEN @start AND @end
        AND (@events = '' OR event_name IN UNNEST(SPLIT(@events, ',')))
      GROUP BY visitor_id
    )
    SELECT CONCAT(f.source, ' / ', f.medium) AS channel,
      COUNT(*) AS visitors,
      COUNTIF(c.visitor_id IS NOT NULL) AS converters,
      AVG(IF(c.visitor_id IS NULL, NULL, TIMESTAMP_DIFF(c.first_conversion, f.ts, SECOND) / 86400)) AS days_to_convert
    FROM first LEFT JOIN conv c USING (visitor_id)
    WHERE f.ts BETWEEN @start AND @end
    GROUP BY channel
    ORDER BY visitors DESC
    LIMIT 100`;

  try {
    const [convRows, acqRows] = await Promise.all([query(pathsSql, params, MAX_CONVERSIONS), query(acquisitionSql, params)]);
    // One path per conversion (a visitor converting twice has two paths).
    const touches = new Map<string, Touch[]>();
    const conversions = convRows.map((r, i) => {
      const key = `${r.visitor_id}#${i}`;
      const path = ((r.path as { ts: number; source: string; medium: string; campaign: string | null }[]) ?? [])
        .map((t) => ({ ts: t.ts, source: t.source ?? "(direct)", medium: t.medium ?? "(none)", campaign: t.campaign ?? "" }))
        .reverse();
      touches.set(key, path);
      return { visitor: key, ts: r.ts as number, value: Number(r.value) || 0 };
    });
    const result = attribute(conversions, touches, lookback);
    const acquisition = acqRows.map((r) => ({
      channel: String(r.channel ?? "(unknown)"),
      visitors: Number(r.visitors) || 0,
      converters: Number(r.converters) || 0,
      daysToConvert: r.days_to_convert == null ? null : Number(r.days_to_convert),
    }));
    return NextResponse.json({
      ...result,
      acquisition,
      newVisitors: acquisition.reduce((s, a) => s + a.visitors, 0),
      lookback,
      eventNames: [...new Set(convRows.map((r) => String(r.event_name)))],
      truncated: convRows.length >= MAX_CONVERSIONS,
    });
  } catch (err) {
    console.error("attribution: BigQuery query failed:", err);
    return NextResponse.json({ error: "Couldn't read attribution data from BigQuery." }, { status: 502 });
  }
}
