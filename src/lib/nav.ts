import type { Role } from "@/lib/roles";
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
  Users,
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Link2;
  comingSoon?: boolean;
  // Client-scoped: lives under /c/<client>/ (agency mode).
  scoped?: boolean;
  // Hidden below this team role (the server enforces it too).
  minRole?: Role;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", scoped: true, minRole: "analyst", label: "UTM Builder", icon: Link2 },
  { href: "/bulk", scoped: true, minRole: "analyst", label: "Bulk Builder", icon: Table2 },
  { href: "/campaigns", scoped: true, minRole: "analyst", label: "Campaign Creator", icon: Sparkles },
  { href: "/campaign-sessions", scoped: true, label: "Campaign Sessions", icon: Activity },
  { href: "/options", scoped: true, minRole: "analyst", label: "UTM Options", icon: SlidersHorizontal },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/dashboard", scoped: true, label: "Dashboard", icon: LayoutDashboard },
  { href: "/measurement/signals", scoped: true, label: "Signals", icon: LineChart },
  { href: "/screener", scoped: true, label: "Screener", icon: Radar },
  { href: "/integrations", scoped: true, minRole: "admin", label: "Integrations", icon: Plug },
  { href: "/team", minRole: "admin", label: "Team", icon: UsersRound },
];
