"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackNow } from "../../lib/analytics";
import { Card } from "../../components/kit/primitives";

/**
 * Stripe's `cancel_url` lands here. The abandonment event is fired from the
 * client because this is the only place in the flow that knows a checkout was
 * started and not finished - Stripe sends no webhook for a session the user
 * simply walked away from.
 *
 * Restyled for the app shell and nothing else: same event, same interval, same
 * two destinations. One card, the same shape as the /succes card. The line
 * that actually matters - that nothing was charged - is set in full ink rather
 * than the muted grey, because a visitor who backed out of a payment is looking
 * for exactly that reassurance and no other. The top bar carries the page's
 * only <h1>, so the card's heading is an <h2>.
 */
export default function CanceledClient({ interval }: { interval: "monthly" | "annual" }) {
  useEffect(() => {
    trackNow("checkout_abandoned", { interval });
  }, [interval]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center">
      <section aria-labelledby="geannuleerd-titel" className="w-full max-w-[38rem]">
        <Card className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Afrekenen</p>
          <h2
            id="geannuleerd-titel"
            className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            Betaling geannuleerd
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Je abonnement is niet afgerond.
          </p>
          <p className="mt-2 text-base font-medium leading-relaxed text-ink">
            Er is niets afgeschreven. Je kunt het opnieuw proberen wanneer je wilt.
          </p>

          {/* White type sits on teal-dark (#0F766E, 5.5:1), not teal (3.74:1). */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/abonnement"
              className="press inline-flex h-11 items-center justify-center rounded-btn bg-teal-dark px-5 text-sm font-semibold text-white no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              Opnieuw proberen
            </Link>
            <Link
              href="/dashboard"
              className="press inline-flex h-11 items-center justify-center rounded-btn border border-line bg-surface px-5 text-sm font-semibold text-ink-body no-underline outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
            >
              Naar dashboard
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
