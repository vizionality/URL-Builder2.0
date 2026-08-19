"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const TOUR_FLAG = "utm.tour.v1";
// Set by the "Replay tour" button on the Account page. When present, the tour
// starts on the next visit to /app regardless of the completed flags.
export const TOUR_REPLAY_FLAG = "utm.tour.replay";

type Placement = "top" | "bottom" | "right" | "left";

type Step = {
  path: string;
  // Optional: a CSS selector to spotlight. Steps without one are shown as a
  // centered "page intro" card over the live (dimmed) page.
  selector?: string;
  title: string;
  body: string;
  placement: Placement;
};

// The guided walkthrough shown to a user the first time they sign in. It
// starts on the UTM Builder, spotlighting its features, then navigates
// through the app's other pages to introduce each one. Completing or skipping
// records the flag (localStorage + Supabase) so it never auto-runs again.
const STEPS: Step[] = [
  {
    path: "/app",
    selector: '[data-tour="nav"]',
    title: "Your toolkit",
    body: "Switch between the UTM Builder, Bulk Builder, Campaign Creator and more from this sidebar. Greyed-out items are coming soon.",
    placement: "right",
  },
  {
    path: "/app",
    selector: '[data-tour="template"]',
    title: "Start from a template",
    body: "Pick a Quick Template (Instagram, Google Ads, Email…) and we'll prefill the UTM source, medium and content for you.",
    placement: "bottom",
  },
  {
    path: "/app",
    selector: '[data-tour="build-form"]',
    title: "Build your URL",
    body: "Enter your website URL and campaign details. Anything you type is validated and assembled into a properly-encoded tracking link.",
    placement: "right",
  },
  {
    path: "/app",
    selector: '[data-tour="generated"]',
    title: "Copy or organize",
    body: "As you fill in the form, your finished UTM URL appears here — ready to copy in one click, or add straight to a Bulk Builder project.",
    placement: "left",
  },
  // Bulk Builder
  {
    path: "/bulk",
    selector: '[data-tour="bulk-toolbar"]',
    title: "Projects & actions",
    body: "Group your URLs into Projects — switch, rename or create them here (up to five). Add Row, Clear All, or Copy All URLs at once.",
    placement: "bottom",
  },
  {
    path: "/bulk",
    selector: '[data-tour="bulk-table"]',
    title: "Fill the grid",
    body: "Enter URLs spreadsheet-style. UTM Source and Medium are dropdowns from your UTM Options, and the Generated URL for each row updates live as you type.",
    placement: "top",
  },
  // Campaign Creator
  {
    path: "/campaigns",
    selector: '[data-tour="campaign-form"]',
    title: "Name your campaign",
    body: "Pick a year and quarter and type an initiative, and we assemble a standardized name like 2026_q1_summer_sale.",
    placement: "right",
  },
  {
    path: "/campaigns",
    selector: '[data-tour="campaign-ai"]',
    title: "Need ideas?",
    body: "Describe the campaign and let AI suggest snake_case initiatives — click a suggestion to use it.",
    placement: "right",
  },
  {
    path: "/campaigns",
    selector: '[data-tour="campaign-output"]',
    title: "Copy the result",
    body: "Your standardized campaign name appears here, ready to copy and reuse.",
    placement: "left",
  },
  // UTM Options
  {
    path: "/options",
    selector: '[data-tour="options-lists"]',
    title: "Manage your values",
    body: "Add or remove Sources, Mediums and Campaigns. These populate the dropdowns in the Bulk Builder, keeping your tracking consistent. That's the tour — happy tracking!",
    placement: "top",
  },
];

const BUBBLE_WIDTH = 320;
const GAP = 14;

export function OnboardingTour({ completed = false }: { completed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Auto-start once, only on the UTM Builder home page. The state update is
  // deferred to a microtask so it doesn't run synchronously in the effect.
  // The account-level flag (from Supabase user_metadata) wins across devices;
  // localStorage is a fast local guard for the same browser.
  useEffect(() => {
    if (pathname !== "/app") return;

    // An explicit replay request overrides the completed flags.
    let replay = false;
    try {
      replay = localStorage.getItem(TOUR_REPLAY_FLAG) === "1";
      if (replay) localStorage.removeItem(TOUR_REPLAY_FLAG);
    } catch {
      replay = false;
    }

    if (!replay) {
      if (completed) return;
      let done = true;
      try {
        done = localStorage.getItem(TOUR_FLAG) === "1";
      } catch {
        done = true;
      }
      if (done) return;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setStep(0);
      setActive(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, completed]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_FLAG, "1");
    } catch {
      // ignore storage failures; worst case the tour shows again.
    }
    // Persist to the account so the tour doesn't reappear on other devices.
    // Fire-and-forget: a failed write just means it may show again elsewhere.
    createClient()
      .auth.updateUser({ data: { tour_completed_v1: true } })
      .catch(() => {});
    setActive(false);
  }, []);

  // Drive the current step: navigate to its page if needed, then locate and
  // measure its target. All setState happens in async callbacks (rAF / timers)
  // so nothing runs synchronously in the effect body.
  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (!s) return;

    // If the step lives on another page, navigate there. The layout — and this
    // component — persist across the client navigation, so when `pathname`
    // updates this effect re-runs and proceeds to measure.
    if (pathname !== s.path) {
      const id = requestAnimationFrame(() => setRect(null));
      router.push(s.path);
      return () => cancelAnimationFrame(id);
    }

    // A page-intro step (no selector) is shown centered over the dimmed page.
    if (!s.selector) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }

    const selector = s.selector;
    function measure() {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect();
      // Ignore hidden/zero-size targets (e.g. the desktop sidebar on mobile)
      // so the bubble falls back to a centered position instead of pinning
      // to the top-left corner.
      setRect(r && r.width > 0 && r.height > 0 ? r : null);
    }

    // The target may not be in the DOM yet right after a navigation; poll
    // briefly until it appears, then settle.
    let tries = 0;
    const poll = window.setInterval(() => {
      const el = document.querySelector(selector);
      tries += 1;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(measure);
        });
        window.clearInterval(poll);
      } else if (tries > 40) {
        // ~2s with no match: fall back to a centered bubble.
        setRect(null);
        window.clearInterval(poll);
      }
    }, 50);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(poll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, pathname, router]);

  // Keyboard: Escape skips, arrows move.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Highlight box around the target (falls back to a centered bubble).
  const pad = 6;
  const highlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const bubblePos = computeBubblePosition(rect, current.placement);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dimmed backdrop with a spotlight cut-out over the target. */}
      {highlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg transition-all duration-200"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
            outline: "2px solid #22c55e",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-slate-900/55" />
      )}

      {/* Click-catcher so the page underneath isn't interactive mid-tour. */}
      <button
        type="button"
        aria-label="Skip tour"
        onClick={finish}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {/* Comment bubble */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        className="absolute rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        style={{ width: BUBBLE_WIDTH, ...bubblePos }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">{current.title}</h3>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={15} />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{current.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-4 bg-green-600" : "w-1.5 bg-zinc-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                isLast ? finish() : setStep((s) => Math.min(s + 1, STEPS.length - 1))
              }
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>

        {step === 0 && (
          <button
            type="button"
            onClick={finish}
            className="mt-2 text-xs font-medium text-zinc-400 hover:text-zinc-600"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}

// Positions the bubble beside the target rect, clamped to the viewport.
function computeBubblePosition(
  rect: DOMRect | null,
  placement: Placement
): { top: number; left: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const estHeight = 180;

  if (!rect) {
    return { top: vh / 2 - estHeight / 2, left: vw / 2 - BUBBLE_WIDTH / 2 };
  }

  let top: number;
  let left: number;
  switch (placement) {
    case "right":
      top = rect.top;
      left = rect.right + GAP;
      break;
    case "left":
      top = rect.top;
      left = rect.left - BUBBLE_WIDTH - GAP;
      break;
    case "top":
      top = rect.top - estHeight - GAP;
      left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
      break;
    case "bottom":
    default:
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
      break;
  }

  // Clamp inside the viewport with an 8px margin.
  left = Math.max(8, Math.min(left, vw - BUBBLE_WIDTH - 8));
  top = Math.max(8, Math.min(top, vh - estHeight - 8));
  return { top, left };
}
