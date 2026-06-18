import {
  Link2,
  Table2,
  Sparkles,
  LayoutDashboard,
  Plug,
  SlidersHorizontal,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "UTM Builder", icon: Link2 },
  { href: "/bulk", label: "Bulk Builder", icon: Table2 },
  { href: "/campaigns", label: "Campaign Creator", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/options", label: "UTM Options", icon: SlidersHorizontal },
];
