// Minimal BigQuery REST client for attribution data (server-only), using the
// service account in BIGQUERY_SA_KEY. Data lives in the app's own project, in
// dataset `attribution`: `touches` and `conversions`, partitioned by day and
// clustered by account, client and visitor.
import { GoogleAuth } from "google-auth-library";

const API = "https://bigquery.googleapis.com/bigquery/v2";
export const DATASET = "attribution";
const LOCATION = "US";
// Raw rows are kept two years (first touches older than that drop off).
const PARTITION_EXPIRATION_MS = String(730 * 86_400_000);

type Field = { name: string; type: string; mode?: string };
const TABLES: Record<"touches" | "conversions", Field[]> = {
  touches: [
    { name: "ts", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "owner_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_slug", type: "STRING", mode: "REQUIRED" },
    { name: "visitor_id", type: "STRING", mode: "REQUIRED" },
    { name: "source", type: "STRING" },
    { name: "medium", type: "STRING" },
    { name: "campaign", type: "STRING" },
    { name: "click_id_type", type: "STRING" },
    { name: "landing_path", type: "STRING" },
  ],
  conversions: [
    { name: "ts", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "owner_id", type: "STRING", mode: "REQUIRED" },
    { name: "client_slug", type: "STRING", mode: "REQUIRED" },
    { name: "visitor_id", type: "STRING", mode: "REQUIRED" },
    { name: "conversion_id", type: "STRING", mode: "REQUIRED" },
    { name: "event_name", type: "STRING" },
    { name: "value", type: "FLOAT64" },
    { name: "currency", type: "STRING" },
    { name: "transaction_id", type: "STRING" },
  ],
};

let auth: GoogleAuth | null = null;
let project = "";

export function bigQueryConfigured(): boolean {
  return Boolean(process.env.BIGQUERY_SA_KEY);
}

function client(): { auth: GoogleAuth; project: string } {
  if (!auth) {
    const raw = process.env.BIGQUERY_SA_KEY;
    if (!raw) throw new Error("BIGQUERY_SA_KEY is not set.");
    const credentials = JSON.parse(raw);
    project = process.env.BIGQUERY_PROJECT_ID || credentials.project_id;
    auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/bigquery"] });
  }
  return { auth, project };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const c = client();
  const token = await c.auth.getAccessToken();
  const res = await fetch(`${API}/projects/${c.project}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error(`BigQuery ${method} ${path} failed (${res.status}): ${await res.text()}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (res.status === 204 ? {} : await res.json()) as T;
}

// Create the dataset and tables the first time (per server instance).
let ready: Promise<void> | null = null;
export function ensureTables(): Promise<void> {
  ready ??= (async () => {
    const ignoreExists = (e: unknown) => {
      if ((e as { status?: number }).status !== 409) throw e;
    };
    await call("POST", "/datasets", { datasetReference: { datasetId: DATASET }, location: LOCATION }).catch(ignoreExists);
    for (const [tableId, fields] of Object.entries(TABLES)) {
      await call("POST", `/datasets/${DATASET}/tables`, {
        tableReference: { tableId },
        schema: { fields },
        timePartitioning: { type: "DAY", field: "ts", expirationMs: PARTITION_EXPIRATION_MS },
        clustering: { fields: ["owner_id", "client_slug", "visitor_id"] },
        requirePartitionFilter: true,
      }).catch(ignoreExists);
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

// Streaming insert. `insertId` lets BigQuery drop a retried duplicate.
export async function insertRows(table: "touches" | "conversions", rows: { insertId?: string; json: Record<string, unknown> }[]) {
  await ensureTables();
  const res = await call<{ insertErrors?: unknown[] }>("POST", `/datasets/${DATASET}/tables/${table}/insertAll`, {
    rows,
    skipInvalidRows: false,
  });
  if (res.insertErrors?.length) throw new Error(`BigQuery insert errors: ${JSON.stringify(res.insertErrors).slice(0, 500)}`);
}

type QueryParam = { name: string; type: "STRING" | "TIMESTAMP" | "INT64" | "FLOAT64"; value: string | number };
type QueryResponse = {
  jobComplete?: boolean;
  jobReference?: { jobId: string; location?: string };
  schema?: { fields: Field[] };
  rows?: { f: { v: unknown }[] }[];
  pageToken?: string;
};

// Standard SQL with named parameters; returns rows as plain objects (all pages).
export async function query(sql: string, params: QueryParam[], maxRows = 100_000): Promise<Record<string, unknown>[]> {
  await ensureTables();
  let res = await call<QueryResponse>("POST", "/queries", {
    query: sql,
    useLegacySql: false,
    location: LOCATION,
    parameterMode: "NAMED",
    queryParameters: params.map((p) => ({ name: p.name, parameterType: { type: p.type }, parameterValue: { value: String(p.value) } })),
    timeoutMs: 30_000,
    maxResults: 10_000,
  });
  const job = res.jobReference;
  // Long queries: wait for the job to finish.
  for (let i = 0; !res.jobComplete && job && i < 20; i++) {
    res = await call<QueryResponse>("GET", `/queries/${job.jobId}?location=${LOCATION}&timeoutMs=10000&maxResults=10000`);
  }
  if (!res.jobComplete) throw new Error("BigQuery query timed out.");
  const fields = res.schema?.fields ?? [];
  const out: Record<string, unknown>[] = [];
  const take = (r: QueryResponse) => {
    for (const row of r.rows ?? []) out.push(decodeRow(fields, row.f));
  };
  take(res);
  while (res.pageToken && job && out.length < maxRows) {
    res = await call<QueryResponse>(
      "GET",
      `/queries/${job.jobId}?location=${LOCATION}&maxResults=10000&pageToken=${encodeURIComponent(res.pageToken)}`
    );
    take(res);
  }
  return out;
}

// BigQuery REST returns every value as a string (and nested records as {f: [...]}).
function decodeValue(field: Field & { fields?: Field[] }, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (field.mode === "REPEATED") return (v as { v: unknown }[]).map((x) => decodeValue({ ...field, mode: "NULLABLE" }, x.v));
  if (field.type === "RECORD" || field.type === "STRUCT") return decodeRow(field.fields ?? [], (v as { f: { v: unknown }[] }).f);
  if (["INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC"].includes(field.type)) return Number(v);
  if (field.type === "TIMESTAMP") return Number(v) * 1000; // seconds (as a string) -> ms
  return v;
}
export function decodeRow(fields: (Field & { fields?: Field[] })[], cells: { v: unknown }[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f, i) => [f.name, decodeValue(f, cells[i]?.v)]));
}
