// Which of a property's events look like conversions worth marking as GA4 key
// events. Pure and unit-tested; the names come from the property's own events.

export type EventCount = { name: string; count: number };
export type Strength = "strong" | "good";
export type Suggestion = EventCount & { strength: Strength; reason: string };

// Collected automatically by GA4 and never conversions on their own.
const AUTOMATIC = new Set([
  "page_view", "session_start", "first_visit", "user_engagement", "scroll",
  "first_open", "screen_view", "app_remove", "os_update", "view_search_results",
]);

// Checked in order; the first match decides. Patterns match anywhere in the name.
const RULES: { re: RegExp; strength: Strength; reason: string }[] = [
  { re: /purchase|checkout_complete|order_complete|transaction/, strength: "strong", reason: "A completed purchase." },
  // A click toward a form (e.g. lead_cta_click) is intent, not the lead itself.
  { re: /cta|lead.*click|click.*lead/, strength: "good", reason: "A click toward your lead form, not the lead itself." },
  { re: /generate_lead|lead|quote|estimate|consult/, strength: "strong", reason: "Someone asked to hear from you." },
  { re: /form_submit|submit|contact|inquiry|enquiry/, strength: "strong", reason: "A form was sent." },
  { re: /sign_?up|register|registration|create_account/, strength: "strong", reason: "A new account or registration." },
  { re: /book|schedule|appointment|calendly|demo|meeting/, strength: "strong", reason: "A booked call or appointment." },
  { re: /phone|tel_|call|click_to_call/, strength: "strong", reason: "A phone call click." },
  { re: /mailto|email_click|click_email/, strength: "good", reason: "An email link click." },
  { re: /whatsapp|chat_start|live_chat|messenger/, strength: "good", reason: "A chat was started." },
  { re: /subscribe|newsletter/, strength: "good", reason: "A newsletter or subscription signup." },
  { re: /begin_checkout|add_payment_info|add_to_cart/, strength: "good", reason: "A step toward a purchase." },
  { re: /file_download|download/, strength: "good", reason: "A resource was downloaded." },
];

// Suggested events, strongest first, then by volume. Events already marked
// as key events and automatic events are left out.
export function suggestKeyEvents(events: EventCount[], alreadyKey: Set<string> = new Set()): Suggestion[] {
  const out: Suggestion[] = [];
  for (const e of events) {
    const name = e.name.toLowerCase();
    if (e.count <= 0 || AUTOMATIC.has(name) || alreadyKey.has(e.name)) continue;
    const rule = RULES.find((r) => r.re.test(name));
    if (rule) out.push({ ...e, strength: rule.strength, reason: rule.reason });
  }
  const rank = (s: Strength) => (s === "strong" ? 0 : 1);
  return out.sort((a, b) => rank(a.strength) - rank(b.strength) || b.count - a.count);
}

// GA4 event names: letters, digits and underscores, starting with a letter.
export function isValidEventName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name);
}
