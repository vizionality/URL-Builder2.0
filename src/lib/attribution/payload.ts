// Pure normalization and validation of an incoming collect payload. The collect
// route never trusts the client's shape: it caps sizes, whitelists fields, and
// coerces types here before anything reaches the database.

import { createHash } from "node:crypto";
import {
  type RawTouch,
  type TouchRow,
  type ConversionInput,
  UTM_FIELDS,
  CLICK_FIELDS,
} from "./types";

const MAX_TOUCHES = 50;
const MAX_STR = 512;

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_STR);
}

function isoOrNow(value: unknown): string {
  if (typeof value === "string") {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

// One raw captured object becomes one normalized TouchRow. Unknown keys are
// dropped; click identifiers are folded into a bounded object.
export function normalizeTouch(raw: RawTouch): TouchRow {
  const clickIds: Record<string, string> = {};
  for (const key of CLICK_FIELDS) {
    const v = str(raw[key]);
    if (v) clickIds[key] = v;
  }
  return {
    occurredAt: isoOrNow(raw.timestamp),
    source: str(raw[UTM_FIELDS[0]]),
    medium: str(raw[UTM_FIELDS[1]]),
    campaign: str(raw[UTM_FIELDS[2]]),
    term: str(raw[UTM_FIELDS[3]]),
    content: str(raw[UTM_FIELDS[4]]),
    clickIds,
    referrer: str(raw.referrer),
    landingPage: str(raw.landing_page),
    isOrganic: raw.is_organic === true,
  };
}

// Validate and cap the touches array from a collect body. Non-arrays and junk
// entries are ignored rather than rejected, so one bad row never drops a beacon.
export function normalizeTouches(input: unknown): TouchRow[] {
  if (!Array.isArray(input)) return [];
  const rows: TouchRow[] = [];
  for (const item of input.slice(0, MAX_TOUCHES)) {
    if (item && typeof item === "object") {
      rows.push(normalizeTouch(item as RawTouch));
    }
  }
  return rows;
}

// A touch carries signal only if it names a source or a click id or a referrer;
// an all-empty row (no tagging, no referrer) is noise and is dropped.
export function hasSignal(row: TouchRow): boolean {
  return Boolean(
    row.source ||
      row.medium ||
      row.campaign ||
      row.referrer ||
      Object.keys(row.clickIds).length > 0
  );
}

export function normalizeConversion(input: unknown): ConversionInput | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const name = str(c.name);
  if (!name) return null;
  const rawValue = c.value;
  const value =
    typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;
  const metadata =
    c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata)
      ? (c.metadata as Record<string, unknown>)
      : {};
  return { name, value, occurredAt: isoOrNow(c.occurredAt), metadata };
}

// Deterministic, non-reversible identity key. Email is lowercased and trimmed,
// then salted and hashed so the stored value cannot be read back to an address.
export function hashIdentity(email: string, salt: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
