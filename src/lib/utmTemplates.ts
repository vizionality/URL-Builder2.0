export interface UtmTemplate {
  id: string;
  name: string;
  platform: string;
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
}

export const utmTemplates: UtmTemplate[] = [
  // Instagram
  { id: "ig-story",       name: "Instagram Story",         platform: "Instagram", source: "instagram", medium: "social",      content: "story" },
  { id: "ig-post",        name: "Instagram Post",          platform: "Instagram", source: "instagram", medium: "social",      content: "post" },
  { id: "ig-reel",        name: "Instagram Reel",          platform: "Instagram", source: "instagram", medium: "social",      content: "reel" },
  { id: "ig-carousel",    name: "Instagram Carousel",      platform: "Instagram", source: "instagram", medium: "social",      content: "carousel" },
  { id: "ig-bio",         name: "Instagram Bio Link",      platform: "Instagram", source: "instagram", medium: "social",      content: "bio" },
  { id: "ig-dm",          name: "Instagram DM",            platform: "Instagram", source: "instagram", medium: "social",      content: "dm" },
  { id: "ig-ad-feed",     name: "Instagram Feed Ad",       platform: "Instagram", source: "instagram", medium: "paid_social", content: "feed" },
  { id: "ig-ad-story",    name: "Instagram Story Ad",      platform: "Instagram", source: "instagram", medium: "paid_social", content: "story" },
  { id: "ig-ad-reel",     name: "Instagram Reel Ad (CPC)", platform: "Instagram", source: "instagram", medium: "cpc",         content: "reel" },

  // Facebook
  { id: "fb-post",        name: "Facebook Post",           platform: "Facebook", source: "facebook", medium: "social",       content: "post" },
  { id: "fb-story",       name: "Facebook Story",          platform: "Facebook", source: "facebook", medium: "social",       content: "story" },
  { id: "fb-group",       name: "Facebook Group",          platform: "Facebook", source: "facebook", medium: "social",       content: "group" },
  { id: "fb-bio",         name: "Facebook Page Bio",       platform: "Facebook", source: "facebook", medium: "social",       content: "bio" },
  { id: "fb-ad-feed",     name: "Facebook Feed Ad",        platform: "Facebook", source: "facebook", medium: "paid_social",  content: "feed" },
  { id: "fb-messenger",   name: "Facebook Messenger",      platform: "Facebook", source: "facebook", medium: "social",       content: "messenger" },

  // YouTube
  { id: "yt-desc",        name: "YouTube Video Description", platform: "YouTube", source: "youtube", medium: "social",       content: "description" },
  { id: "yt-endcard",     name: "YouTube End Card",        platform: "YouTube", source: "youtube", medium: "social",         content: "endcard" },
  { id: "yt-comment",     name: "YouTube Pinned Comment",  platform: "YouTube", source: "youtube", medium: "social",         content: "comment" },
  { id: "yt-community",   name: "YouTube Community Post",  platform: "YouTube", source: "youtube", medium: "social",         content: "community" },
  { id: "yt-shorts",      name: "YouTube Shorts",          platform: "YouTube", source: "youtube", medium: "social",         content: "shorts" },
  { id: "yt-ad",          name: "YouTube Ad",              platform: "YouTube", source: "youtube", medium: "cpc",            content: "video" },

  // TikTok
  { id: "tt-video",       name: "TikTok Video",            platform: "TikTok", source: "tiktok", medium: "social",          content: "video" },
  { id: "tt-bio",         name: "TikTok Bio Link",         platform: "TikTok", source: "tiktok", medium: "social",          content: "bio" },
  { id: "tt-dm",          name: "TikTok DM",               platform: "TikTok", source: "tiktok", medium: "social",          content: "dm" },
  { id: "tt-ad",          name: "TikTok Ad",               platform: "TikTok", source: "tiktok", medium: "paid_social",     content: "video" },

  // X (Twitter)
  { id: "x-post",         name: "X Post",                  platform: "X (Twitter)", source: "x", medium: "social",          content: "post" },
  { id: "x-bio",          name: "X Bio",                   platform: "X (Twitter)", source: "x", medium: "social",          content: "bio" },
  { id: "x-dm",           name: "X DM",                    platform: "X (Twitter)", source: "x", medium: "social",          content: "dm" },
  { id: "x-ad",           name: "X Ad",                    platform: "X (Twitter)", source: "x", medium: "paid_social",     content: "post" },

  // LinkedIn
  { id: "li-post",        name: "LinkedIn Post",           platform: "LinkedIn", source: "linkedin", medium: "social",      content: "post" },
  { id: "li-article",     name: "LinkedIn Article",        platform: "LinkedIn", source: "linkedin", medium: "social",      content: "article" },
  { id: "li-page",        name: "LinkedIn Company Page",   platform: "LinkedIn", source: "linkedin", medium: "social",      content: "page" },
  { id: "li-msg",         name: "LinkedIn Message",        platform: "LinkedIn", source: "linkedin", medium: "social",      content: "dm" },
  { id: "li-sponsored",   name: "LinkedIn Sponsored Content", platform: "LinkedIn", source: "linkedin", medium: "paid_social", content: "sponsored" },

  // Pinterest
  { id: "pin-pin",        name: "Pinterest Pin",           platform: "Pinterest", source: "pinterest", medium: "social",    content: "pin" },
  { id: "pin-board",      name: "Pinterest Board",         platform: "Pinterest", source: "pinterest", medium: "social",    content: "board" },
  { id: "pin-promoted",   name: "Pinterest Promoted Pin",  platform: "Pinterest", source: "pinterest", medium: "paid_social", content: "pin" },

  // Snapchat
  { id: "snap-story",     name: "Snapchat Story",          platform: "Snapchat", source: "snapchat", medium: "social",      content: "story" },
  { id: "snap-spotlight", name: "Snapchat Spotlight",      platform: "Snapchat", source: "snapchat", medium: "social",      content: "spotlight" },
  { id: "snap-ad",        name: "Snapchat Ad",             platform: "Snapchat", source: "snapchat", medium: "paid_social", content: "ad" },

  // Email
  { id: "em-newsletter",  name: "Email Newsletter",        platform: "Email", source: "newsletter", medium: "email" },
  { id: "em-promo",       name: "Email Promo",             platform: "Email", source: "email", medium: "email",             content: "promo" },
  { id: "em-transactional", name: "Email Transactional",   platform: "Email", source: "email", medium: "email",             content: "transactional" },
  { id: "em-signature",   name: "Email Signature",         platform: "Email", source: "email", medium: "email",             content: "signature" },
  { id: "em-automation",  name: "Email Drip / Automation", platform: "Email", source: "email", medium: "email",             content: "automation" },

  // Google Ads
  { id: "gads-search",    name: "Google Search Ad",        platform: "Google Ads", source: "google", medium: "cpc",         content: "search" },
  { id: "gads-display",   name: "Google Display Ad",       platform: "Google Ads", source: "google", medium: "display",     content: "banner" },
  { id: "gads-shopping",  name: "Google Shopping Ad",      platform: "Google Ads", source: "google", medium: "cpc",         content: "shopping" },
  { id: "gads-youtube",   name: "Google YouTube Ad",       platform: "Google Ads", source: "google", medium: "cpc",         content: "video" },
  { id: "gads-pmax",      name: "Google Performance Max",   platform: "Google Ads", source: "google", medium: "cpc",        content: "pmax" },
  { id: "gads-demandgen", name: "Google Demand Gen",       platform: "Google Ads", source: "google", medium: "cpc",         content: "demandgen" },

  // Other
  { id: "reddit-post",    name: "Reddit Post",             platform: "Other", source: "reddit", medium: "social",          content: "post" },
  { id: "reddit-ad",      name: "Reddit Ad",               platform: "Other", source: "reddit", medium: "paid_social",     content: "post" },
  { id: "whatsapp",       name: "WhatsApp Message",        platform: "Other", source: "whatsapp", medium: "social",        content: "message" },
  { id: "threads",        name: "Threads Post",            platform: "Other", source: "threads", medium: "social",         content: "post" },
  { id: "sms",            name: "SMS Broadcast",           platform: "Other", source: "sms", medium: "sms",                content: "broadcast" },
  { id: "podcast",        name: "Podcast Episode",         platform: "Other", source: "podcast", medium: "audio",          content: "episode" },
  { id: "qr",             name: "QR Code",                 platform: "Other", source: "qr", medium: "offline" },
  { id: "affiliate",      name: "Affiliate Link",          platform: "Other", source: "partner", medium: "affiliate",      content: "link" },
];

// Platform grouping order for the Quick Template <optgroup>s.
export const templatePlatformOrder: string[] = [
  "Instagram",
  "Facebook",
  "YouTube",
  "TikTok",
  "X (Twitter)",
  "LinkedIn",
  "Pinterest",
  "Snapchat",
  "Email",
  "Google Ads",
  "Other",
];
