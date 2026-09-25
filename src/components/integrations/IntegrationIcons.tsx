import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Platform marks for the integration tiles (simplified, drawn inline).
export function GoogleAnalyticsIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="30" y="4" width="12" height="40" rx="6" fill="#F9AB00" />
      <rect x="18" y="18" width="12" height="26" rx="6" fill="#E37400" />
      <circle cx="12" cy="38" r="6" fill="#E37400" />
    </svg>
  );
}

export function SearchConsoleIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="4" y="8" width="36" height="26" rx="4" fill="#4285F4" />
      <rect x="4" y="8" width="36" height="6" rx="3" fill="#1A73E8" />
      <circle cx="26" cy="28" r="9" fill="#fff" stroke="#34A853" strokeWidth="4" />
      <path d="M32.5 34.5 42 44" stroke="#34A853" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function BackToIntegrations() {
  return (
    <Link href="/integrations" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800">
      <ChevronLeft className="h-4 w-4" /> All integrations
    </Link>
  );
}
