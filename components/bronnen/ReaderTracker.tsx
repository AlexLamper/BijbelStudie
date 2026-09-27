"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markOpened, markRead } from "./useBronProgress";

/**
 * Sits at the foot of the reader's text. Opening the page records it as the
 * work's current section; this marker scrolling into view marks the section
 * read (so a short section that fits the screen counts at once). Also binds
 * ← and → to the previous and next section.
 */
export function ReaderTracker({
  slug,
  sectionId,
  prevHref,
  nextHref,
}: {
  slug: string;
  sectionId: string;
  prevHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markOpened(slug, sectionId);
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        markRead(slug, sectionId);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [slug, sectionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [role='menu'], [role='dialog'], [role='slider'], [role='tablist']"))
      ) {
        return;
      }
      const href = e.key === "ArrowLeft" ? prevHref : nextHref;
      if (!href) return;
      e.preventDefault();
      router.push(href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref]);

  return <div ref={end} aria-hidden className="h-px" />;
}
