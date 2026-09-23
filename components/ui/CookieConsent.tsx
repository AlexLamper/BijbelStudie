"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { setConsent } from "../../lib/cookieConsent";
import { useCookieConsent } from "../../hooks/useCookieConsent";

/**
 * Cookiebanner.
 *
 * WHAT IT ASKS AND WHAT IT DOES NOT. The login/session cookies, the language
 * cookie and whatever Stripe sets during a running checkout are strictly
 * necessary and are never gated - asking about them would be theatre, and
 * turning them off would break signing in and paying. What genuinely waits for
 * an answer is usage measurement - our own statistics (lib/analytics.ts) and
 * Google Analytics (lib/googleAnalytics.ts) - plus the `bs_seen_landing`
 * convenience cookie. That is one purpose, so one question and no fake
 * toggles. See lib/cookieConsent.ts.
 *
 * BOTH ANSWERS ARE EQUAL. "Accepteren" and "Alleen noodzakelijk" are the same
 * size, the same shape and one click each; refusing is remembered exactly as
 * long as accepting.
 *
 * NOT ON /studie. The lesson flow is a window, not the app shell (see
 * app/studie/layout.tsx): no global header, a hover icon rail and a page-swipe
 * that owns the bottom of the screen. A fixed bar across it would sit on the
 * lesson's own foot. Nothing optional runs without an answer, so staying
 * silent there costs nothing - the reader is asked on any other page.
 */

/** `/studies` is a different route and must still get the banner. */
function isImmersiveStudyPath(pathname: string | null): boolean {
  return pathname === "/studie" || Boolean(pathname?.startsWith("/studie/"));
}

const TEAL = "#0D9488";

export default function CookieConsent() {
  const pathname = usePathname();
  const { mounted, consent } = useCookieConsent();
  const acceptRef = useRef<HTMLButtonElement | null>(null);

  const hidden = !mounted || consent !== null || isImmersiveStudyPath(pathname);

  // Focus lands on the first action once the bar appears, so it is reachable
  // by keyboard without hunting; it is not a focus trap, because the page
  // behind it stays fully usable while the question is open.
  useEffect(() => {
    if (!hidden) acceptRef.current?.focus();
  }, [hidden]);

  const choose = useCallback((status: "accepted" | "declined") => {
    setConsent(status);
  }, []);

  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-6 text-ink">Cookies</h2>
          <p className="mt-1 text-[14px] leading-6 text-ink-body">
            Noodzakelijke cookies gebruiken we altijd: ze houden je ingelogd, beveiligen het inloggen en
            maken betalen via Stripe mogelijk. Daarnaast meten we graag hoe BijbelStudie gebruikt wordt, met
            onze eigen statistieken en met Google Analytics, om de website te verbeteren. Dat doen we alleen
            als je daarmee akkoord gaat. We gebruiken geen advertentiecookies.{" "}
            <Link href="/privacybeleid#cookies" className="font-semibold underline underline-offset-2" style={{ color: TEAL }}>
              Meer informatie
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Alleen noodzakelijk
          </button>
          <button
            ref={acceptRef}
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: TEAL }}
          >
            Accepteren
          </button>
        </div>
      </div>
    </div>
  );
}
