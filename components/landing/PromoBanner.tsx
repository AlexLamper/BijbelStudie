'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PROMO_ENABLED, PROMO_LINK, promoWindow } from '../../lib/promo';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function format(secondsLeft: number): string {
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return `${days}d ${pad(hours)}u ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Counts down to the end of the *current* action window.
 *
 * The action runs one week in every two, so the tick re-reads the window each
 * second rather than closing over a single end date: when a window closes the
 * banner disappears by itself, and when the next one opens a page left sitting
 * open picks it up without a reload. `state` starts `null` so server and first
 * client paint both render nothing - the banner only appears once the browser
 * has checked the real clock, which is what keeps a closed window from flashing
 * on screen before it hides itself.
 */
function usePromoCountdown() {
  const [state, setState] = useState<{ endsAt: number; left: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const win = promoWindow(now);
      setState(
        win.active
          ? { endsAt: win.endsAt, left: Math.max(0, Math.floor((win.endsAt - now) / 1000)) }
          : null,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return state;
}

function endDateLabel(endsAt: number): string {
  return new Date(endsAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

export function PromoBanner() {
  const promo = usePromoCountdown();

  if (!PROMO_ENABLED) return null;
  // Still mounting, or this week is an off-week: render nothing.
  if (promo === null || promo.left <= 0) return null;

  const countdown = format(promo.left);

  return (
    <div
      style={{ backgroundColor: '#0b3f37' }}
      aria-label={`Actie eindigt op ${endDateLabel(promo.endsAt)}`}
    >
      {/* Desktop / tablet: one row. */}
      <div
        className="mx-auto hidden max-w-[1440px] items-center justify-center gap-5 px-4 text-[15px] md:flex"
        style={{ height: 48 }}
      >
        <span>
          <strong className="font-extrabold text-white">BijbelStudie Pro 7 dagen gratis</strong>
          <span style={{ color: '#a9d8ca' }}> · alle commentaren en de grondtekst</span>
        </span>
        <span aria-hidden style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
        <span className="flex items-center gap-2 text-sm" style={{ color: '#a9d8ca' }}>
          <span>Actie eindigt over</span>
          <span
            className="font-extrabold text-white"
            style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
          >
            {countdown}
          </span>
        </span>
        <Link
          href={PROMO_LINK}
          className="flex items-center gap-1.5 border-b text-sm font-bold text-white no-underline"
          style={{ borderColor: 'rgba(255,255,255,0.45)', paddingBottom: 1 }}
        >
          Probeer Pro
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Mobile: two centered lines. */}
      <div
        className="flex flex-col items-center gap-1 px-5 py-2.5 text-center text-[13px] md:hidden"
      >
        <span>
          <strong className="font-extrabold text-white">Pro 7 dagen gratis</strong>
          <span style={{ color: '#a9d8ca' }}> · nog </span>
          <strong className="font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {countdown}
          </strong>
        </span>
        <Link
          href={PROMO_LINK}
          className="flex items-center gap-1 border-b text-[13px] font-bold text-white no-underline"
          style={{ borderColor: 'rgba(255,255,255,0.45)' }}
        >
          Probeer Pro
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
