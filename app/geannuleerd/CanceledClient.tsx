"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackNow } from "../../lib/analytics";
import { CTA_PRIMARY, EYEBROW } from "../../components/scene/tokens";

/**
 * Stripe's `cancel_url` lands here. The abandonment event is fired from the
 * client because this is the only place in the flow that knows a checkout was
 * started and not finished - Stripe sends no webhook for a session the user
 * simply walked away from.
 *
 * Restyled for the scene and nothing else: same event, same interval, same two
 * destinations. The one line that actually matters - that nothing was charged -
 * is the largest thing on the screen, because a visitor who backed out of a
 * payment is looking for exactly that reassurance and no other.
 */
export default function CanceledClient({ interval }: { interval: "monthly" | "annual" }) {
  useEffect(() => {
    trackNow("checkout_abandoned", { interval });
  }, [interval]);

  return (
    <section
      aria-labelledby="geannuleerd-titel"
      className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-16"
    >
      <div className="scene-sky mx-auto w-full max-w-[40rem]">
        <p className={EYEBROW}>Afrekenen</p>
        <h1
          id="geannuleerd-titel"
          className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl"
        >
          Betaling geannuleerd
        </h1>
        <p className="mt-4 max-w-[32rem] text-base leading-relaxed text-white/85 sm:text-lg">
          Je abonnement is niet afgerond.
        </p>
        <p className="mt-3 max-w-[32rem] text-base leading-relaxed text-white/80">
          Er is niets afgeschreven. Je kunt het opnieuw proberen wanneer je wilt.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/abonnement" className={CTA_PRIMARY}>
            Opnieuw proberen
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md text-sm font-semibold text-white/85 no-underline underline-offset-4 outline-none transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white"
          >
            Naar dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
