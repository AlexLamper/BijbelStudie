'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import {
  sendPageView,
  startGoogleAnalytics,
  stopGoogleAnalytics,
} from '../../lib/googleAnalytics';

/**
 * Google Analytics, only after "Accepteren" and only on production. Renders
 * nothing. All the rules - basic consent mode, sanitised URLs, the kill switch
 * on withdrawal - live in lib/googleAnalytics.ts.
 *
 * `enabled` is decided on the server (app/layout.tsx), because VERCEL_ENV is
 * not visible in the browser.
 */

/**
 * The page view waits a moment after the route changes, so `document.title`
 * is the new page's title rather than the previous one. A visit shorter than
 * this is not counted, which is no loss.
 */
const PAGE_VIEW_DELAY_MS = 300;

export default function GoogleAnalytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const { mounted, analyticsAllowed } = useCookieConsent();
  const active = enabled && mounted && analyticsAllowed;

  useEffect(() => {
    if (!enabled || !mounted) return;
    if (analyticsAllowed) startGoogleAnalytics();
    else stopGoogleAnalytics();
  }, [enabled, mounted, analyticsAllowed]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      try {
        sendPageView();
      } catch {
        /* telemetry is never allowed to surface */
      }
    }, PAGE_VIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, pathname]);

  return null;
}
