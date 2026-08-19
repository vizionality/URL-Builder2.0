"use client";

import { useEffect } from "react";
import { HAS_GTM } from "@/lib/analytics";

// Pushes a `ui_click` event to the dataLayer for every click on an interactive
// element (link, button, or role=button), carrying the element's text, URL,
// id, classes, and tag. GTM's built-in click triggers are unreliable on a
// client-navigated SPA, so this gives a dependable signal you can build your
// own triggers on: create Data Layer Variables for `click_text` / `click_url`
// and a Custom Event trigger on event name `ui_click`.
export function ClickTracker() {
  useEffect(() => {
    if (!HAS_GTM) return;

    function onClick(e: MouseEvent) {
      const start = e.target as Element | null;
      const el = start?.closest?.(
        'a, button, [role="button"], input[type="submit"], input[type="button"]'
      );
      if (!el) return;

      const anchor = el.closest("a");
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "ui_click",
        click_text: (el.textContent ?? "").trim().slice(0, 120),
        click_url: anchor?.getAttribute("href") ?? "",
        click_id: el.getAttribute("id") ?? "",
        click_classes: el.getAttribute("class") ?? "",
        click_tag: el.tagName.toLowerCase(),
      });
    }

    // Capture phase so we still see the click even if a handler stops
    // propagation or navigation happens immediately after.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
