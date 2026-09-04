import { createAdminClient } from "@/lib/supabase/admin";
import type { TouchRow, ConversionInput } from "./types";
import type {
  EngineTouch,
  EngineConversion,
  IdentityLink,
} from "./engine";

// Read side for the report: pull touches (over the lookback window), conversions
// (in range), and identity links for one site, mapped into the engine's shapes.
// Scoped by site_id, which the caller has already verified the user owns.
export async function fetchReportRows(
  siteId: string,
  touchStartIso: string,
  startIso: string,
  endIso: string
): Promise<{ touches: EngineTouch[]; conversions: EngineConversion[]; links: IdentityLink[] }> {
  const admin = createAdminClient();
  const [touchesRes, convRes, linksRes] = await Promise.all([
    // Touches reach back a lookback window before the reporting start so a
    // conversion inside the window still sees the touches that led to it.
    admin
      .from("attribution_touches")
      .select("visitor_id, occurred_at, source, medium, campaign, click_ids, referrer")
      .eq("site_id", siteId)
      .gte("occurred_at", touchStartIso)
      .lte("occurred_at", endIso)
      .order("occurred_at", { ascending: true })
      .limit(50000),
    // Conversions are counted only inside the reporting range.
    admin
      .from("attribution_conversions")
      .select("visitor_id, occurred_at, value")
      .eq("site_id", siteId)
      .gte("occurred_at", startIso)
      .lte("occurred_at", endIso)
      .limit(50000),
    admin
      .from("attribution_identity_links")
      .select("visitor_id, identity_key")
      .eq("site_id", siteId)
      .limit(50000),
  ]);
  if (touchesRes.error) throw touchesRes.error;
  if (convRes.error) throw convRes.error;
  if (linksRes.error) throw linksRes.error;

  const touches: EngineTouch[] = (touchesRes.data ?? []).map((t) => ({
    visitorId: t.visitor_id as string,
    occurredAt: t.occurred_at as string,
    source: (t.source as string) ?? null,
    medium: (t.medium as string) ?? null,
    campaign: (t.campaign as string) ?? null,
    clickIds: (t.click_ids as Record<string, string>) ?? {},
    referrer: (t.referrer as string) ?? null,
  }));
  const conversions: EngineConversion[] = (convRes.data ?? []).map((c) => ({
    visitorId: c.visitor_id as string,
    occurredAt: c.occurred_at as string,
    value: (c.value as number) ?? null,
  }));
  const links: IdentityLink[] = (linksRes.data ?? []).map((l) => ({
    visitorId: l.visitor_id as string,
    identityKey: l.identity_key as string,
  }));
  return { touches, conversions, links };
}

// Persistence for captured attribution data. Every write is scoped by site_id,
// and the site was already resolved from an owner, so a visitor can only ever
// land under the account that owns the site. Server-side only (service role).

export async function upsertVisitor(
  siteId: string,
  visitorId: string,
  geo: { country: string | null; region: string | null },
  identityKey: string | null
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  // Insert on first sight; on repeat, refresh last_seen (and geo/identity when
  // newly known) without clobbering first_seen.
  const { error } = await admin.from("attribution_visitors").upsert(
    {
      site_id: siteId,
      visitor_id: visitorId,
      last_seen: now,
      country: geo.country,
      region: geo.region,
      ...(identityKey ? { identity_key: identityKey } : {}),
    },
    { onConflict: "site_id,visitor_id" }
  );
  if (error) throw error;
}

export async function insertTouches(
  siteId: string,
  visitorId: string,
  touches: TouchRow[]
): Promise<void> {
  if (touches.length === 0) return;
  const admin = createAdminClient();
  const rows = touches.map((t) => ({
    site_id: siteId,
    visitor_id: visitorId,
    occurred_at: t.occurredAt,
    source: t.source,
    medium: t.medium,
    campaign: t.campaign,
    term: t.term,
    content: t.content,
    click_ids: t.clickIds,
    referrer: t.referrer,
    landing_page: t.landingPage,
    is_organic: t.isOrganic,
  }));
  // Dedupe replays of the same beacon on the unique key.
  const { error } = await admin.from("attribution_touches").upsert(rows, {
    onConflict: "site_id,visitor_id,occurred_at,source,medium,campaign",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function insertConversion(
  siteId: string,
  visitorId: string,
  identityKey: string | null,
  conversion: ConversionInput
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("attribution_conversions").insert({
    site_id: siteId,
    visitor_id: visitorId,
    identity_key: identityKey,
    name: conversion.name,
    value: conversion.value,
    occurred_at: conversion.occurredAt,
    metadata: conversion.metadata,
  });
  if (error) throw error;
}

// Link a visitor to a hashed identity (idempotent), and stamp the identity onto
// the visitor so later reads can merge devices under one person.
export async function linkIdentity(
  siteId: string,
  visitorId: string,
  identityKey: string
): Promise<void> {
  const admin = createAdminClient();
  const { error: linkErr } = await admin.from("attribution_identity_links").upsert(
    { site_id: siteId, identity_key: identityKey, visitor_id: visitorId },
    { onConflict: "site_id,identity_key,visitor_id", ignoreDuplicates: true }
  );
  if (linkErr) throw linkErr;
  const { error: visErr } = await admin
    .from("attribution_visitors")
    .update({ identity_key: identityKey })
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId);
  if (visErr) throw visErr;
}
