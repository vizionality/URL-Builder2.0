import {
  Link2,
  Table2,
  Sparkles,
  LayoutDashboard,
  Plug,
  SlidersHorizontal,
  Activity,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Link2;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "UTM Builder", icon: Link2 },
  { href: "/bulk", label: "Bulk Builder", icon: Table2 },
  { href: "/campaigns", label: "Campaign Creator", icon: Sparkles },
  { href: "/campaign-sessions", label: "Campaign Sessions", icon: Activity, comingSoon: true },
  { href: "/options", label: "UTM Options", icon: SlidersHorizontal },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, comingSoon: true },
  { href: "/integrations", label: "Integrations", icon: Plug, comingSoon: true },
];
