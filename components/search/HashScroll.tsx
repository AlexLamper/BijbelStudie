"use client";

import { useEffect } from "react";
import { INTENT_EVENT } from "../../lib/commands/deepLink";

/**
 * Scrolls to the element named in the URL hash.
 *
 * The app shell scrolls its own content container, not the window, and a
 * client-side navigation from the command palette (router.push("/help#...")),
 * including one to the page already on screen, does not always bring the
 * fragment into view there. Renders nothing.
 */
export default function HashScroll() {
  useEffect(() => {
    function go() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      // One frame later, so the target has been painted after a navigation.
      window.requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    }
    go();
    window.addEventListener("hashchange", go);
    window.addEventListener(INTENT_EVENT, go);
    return () => {
      window.removeEventListener("hashchange", go);
      window.removeEventListener(INTENT_EVENT, go);
    };
  }, []);
  return null;
}
