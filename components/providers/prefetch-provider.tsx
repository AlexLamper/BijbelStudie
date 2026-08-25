'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Routes where the Bible reader is the likely next screen. */
const READER_ROUTES = ['/dashboard', '/studie', '/lezen', '/leesplannen', '/studies'];

/**
 * Warms the Bible endpoints for people who are about to read.
 *
 * It used to run on every page in the app, so an anonymous visitor landing on
 * the marketing page fired four requests - including a full chapter of
 * Genesis - that competed with that page's own resources and invoked four
 * serverless functions per visit. Now it only runs where the reader is
 * plausibly next, and only once the browser is idle, so it can never sit in
 * front of a Largest Contentful Paint.
 *
 * The ASV request is gone with it: this site ships Dutch translations only.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !READER_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`))) {
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      Promise.all([
        fetch('/api/bible/versions'),
        fetch('/api/bible/books?version=statenvertaling'),
        fetch('/api/bible/chapter?version=statenvertaling&book=Genesis&chapter=1'),
      ]).catch(() => {
        // Warming the cache is best-effort; a failure changes nothing.
      });
    };

    // This only ever runs in an effect, so `window` is always defined here.
    const supportsIdle = 'requestIdleCallback' in window;
    const handle = supportsIdle
      ? window.requestIdleCallback(run, { timeout: 3000 })
      : window.setTimeout(run, 1500);

    return () => {
      cancelled = true;
      if (supportsIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [pathname]);

  return <>{children}</>;
}
