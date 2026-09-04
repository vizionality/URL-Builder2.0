import { createAdminClient } from "@/lib/supabase/admin";
import type { TouchRow, ConversionInput } from "./types";

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
