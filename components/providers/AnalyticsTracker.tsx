'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Page views and clicks, for /admin/insights.
 *
 * Two listeners and nothing else. Mounted once in the root layout.
 *
 * CLICKS ARE DELEGATED, not wired per component: a document-level listener
 * reads `data-track` off the nearest ancestor of whatever was clicked. That
 * keeps instrumentation to one attribute per surface instead of an onClick
 * wrapper in forty components, and it cannot change what a button does - the
 * listener only observes.
 *
 * What is deliberately NOT collected: coordinates, element text, scroll depth,
 * hover paths, IP, user agent. "Where someone clicked" is answered at the
 * granularity of a named surface (`study_start`, `sidebar_lezen`), which is the
 * granularity a product decision is actually made at. Anything finer would turn
 * this collection into behavioural surveillance of individual readers, and the
 * privacy policy says the opposite.
 *
 * WHY `lib/analytics` IS IMPORTED INSIDE THE EFFECT, not at the top.
 *
 * This component is rendered by the ROOT layout, so it is in the client graph
 * of every single route. A static import would put the analytics module - and
 * anything it ever grows to import - in that graph too, and a module there that
 * fails to resolve takes down the whole application with
 * "Cannot read properties of undefined (reading 'call')" pointing at this line,
 * which is exactly what happened once already. An await inside an effect makes
 * it a separate async chunk: if it fails, telemetry stops and the page does not.
 * That is the same rule the analytics module states for itself - a failed
 * telemetry call must never interrupt what the user was doing.
 */

type TrackFn = (name: string, props?: Record<string, string>) => void;

/** Resolved once, then reused. Never throws; returns null when unavailable. */
let trackPromise: Promise<TrackFn | null> | null = null;

function getTrack(): Promise<TrackFn | null> {
  if (!trackPromise) {
    trackPromise = import('../../lib/analytics')
      .then((mod) => mod.track as unknown as TrackFn)
      .catch(() => null);
  }
  return trackPromise;
}

function send(name: string, props: Record<string, string>): void {
  void getTrack()
    .then((track) => {
      try {
        track?.(name, props);
      } catch {
        /* telemetry is never allowed to surface */
      }
    })
    .catch(() => {});
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    // `path` is normalised to a route key on the server - see lib/analyticsRoutes.
    send('page_view', { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        const start = event.target;
        if (!(start instanceof Element)) return;

        const el = start.closest('[data-track]');
        const target = el?.getAttribute('data-track');
        if (!target) return;

        send('ui_click', { target, path: window.location.pathname });
      } catch {
        /* a listener that throws would break the click for the user */
      }
    };

    // Capture phase: a handler that calls stopPropagation - the dropdowns and
    // dialogs do - must not also stop this from counting.
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
