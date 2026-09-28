// Bot detection: score GA4 traffic segments (a country, city, source, ...)
// on signals that point to bots. GA4 already drops known bots; this surfaces
// what gets through. Pure and unit-tested.

export type Segment = {
  value: string;
  sessions: number;
  engagedSessions: number;
  engagementSeconds: number; // userEngagementDuration
  newUsers: number;
  users: number;
};

export type BotDimension = "country" | "city" | "sourceMedium" | "browser" | "screenResolution" | "landingPage";

export type Scored = Segment & {
  engagementRate: number; // 0..1
  secondsPerSession: number;
  score: number; // 0..100
  level: "bot" | "suspicious" | "ok";
  reasons: string[];
};

// Where cloud / datacenter traffic (scrapers, headless browsers) usually comes from.
export const BOT_COUNTRIES = new Set(["Singapore", "China", "Hong Kong", "Russia", "Vietnam", "Bangladesh", "Pakistan"]);
export const DATACENTER_CITIES = new Set([
  "Ashburn", "Boardman", "Council Bluffs", "Moses Lake", "Quincy", "The Dalles", "Prineville", "Lanzhou",
  "Singapore", "Santa Clara", "Des Moines", "Columbus", "Beijing", "Shanghai", "Shenzhen", "Hangzhou",
]);
// Default window sizes of headless browsers and automation tools.
export const HEADLESS_RESOLUTIONS = new Set(["800x600", "1024x768", "1280x720", "0x0", "(not set)"]);

export const MIN_SESSIONS = 5;

export function scoreSegment(dim: BotDimension, s: Segment): Scored {
  const engagementRate = s.sessions ? s.engagedSessions / s.sessions : 0;
  const secondsPerSession = s.sessions ? s.engagementSeconds / s.sessions : 0;
  const newShare = s.users ? s.newUsers / s.users : 0;
  const reasons: string[] = [];
  let score = 0;

  if (engagementRate < 0.05) {
    score += 40;
    reasons.push(`${(engagementRate * 100).toFixed(0)}% engaged`);
  } else if (engagementRate < 0.2) {
    score += 20;
    reasons.push(`Low engagement (${(engagementRate * 100).toFixed(0)}%)`);
  }
  if (secondsPerSession < 1) {
    score += 25;
    reasons.push("~0s engagement per session");
  } else if (secondsPerSession < 3) {
    score += 10;
    reasons.push(`${secondsPerSession.toFixed(1)}s per session`);
  }
  if (s.sessions >= 20 && newShare >= 0.95) {
    score += 10;
    reasons.push(`${(newShare * 100).toFixed(0)}% new users`);
  }
  const v = s.value.trim();
  if (dim === "country" && BOT_COUNTRIES.has(v)) {
    score += 20;
    reasons.push("Common bot / datacenter country");
  }
  if (dim === "city" && DATACENTER_CITIES.has(v)) {
    score += 25;
    reasons.push("Cloud datacenter city");
  }
  if (dim === "screenResolution" && HEADLESS_RESOLUTIONS.has(v)) {
    score += 15;
    reasons.push("Headless-browser screen size");
  }
  if (v === "(not set)" && dim !== "city" && dim !== "country") {
    score += 15;
    reasons.push("Value not set");
  }
  if (dim === "sourceMedium" && /^\(direct\) \/ \(none\)$/.test(v) && engagementRate < 0.1) {
    score += 5;
    reasons.push("Direct with no engagement");
  }

  score = Math.min(100, score);
  // Small segments can't be judged reliably.
  const level = s.sessions < MIN_SESSIONS ? "ok" : score >= 60 ? "bot" : score >= 35 ? "suspicious" : "ok";
  return { ...s, engagementRate, secondsPerSession, score, level, reasons };
}

// Days whose unengaged share jumps well above normal: likely bot bursts.
export function spikeDays(days: { date: string; sessions: number; engagedSessions: number }[]): Set<string> {
  const shares = days.filter((d) => d.sessions > 0).map((d) => 1 - d.engagedSessions / d.sessions);
  if (shares.length < 5) return new Set();
  const sorted = [...shares].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const sessionsSorted = days.map((d) => d.sessions).sort((a, b) => a - b);
  const medianSessions = sessionsSorted[Math.floor(sessionsSorted.length / 2)];
  return new Set(
    days
      .filter((d) => d.sessions >= Math.max(10, medianSessions * 1.5) && 1 - d.engagedSessions / d.sessions >= Math.min(0.95, median + 0.25))
      .map((d) => d.date)
  );
}
