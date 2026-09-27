import {
  Link2,
  Table2,
  Sparkles,
  LayoutDashboard,
  Plug,
  SlidersHorizontal,
  Activity,
  LineChart,
  Radar,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Link2;
  comingSoon?: boolean;
  // Client-scoped: lives under /c/<client>/ (agency mode).
  scoped?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "UTM Builder", icon: Link2 },
  { href: "/bulk", label: "Bulk Builder", icon: Table2 },
  { href: "/campaigns", label: "Campaign Creator", icon: Sparkles },
  { href: "/campaign-sessions", scoped: true, label: "Campaign Sessions", icon: Activity },
  { href: "/options", label: "UTM Options", icon: SlidersHorizontal },
  { href: "/dashboard", scoped: true, label: "Dashboard", icon: LayoutDashboard },
  { href: "/measurement/signals", scoped: true, label: "Signals", icon: LineChart },
  { href: "/screener", scoped: true, label: "Screener", icon: Radar },
  { href: "/integrations", scoped: true, label: "Integrations", icon: Plug },
];
