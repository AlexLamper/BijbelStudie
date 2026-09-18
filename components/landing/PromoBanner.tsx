'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PROMO_ENABLED, PROMO_END, PROMO_LINK } from '../../lib/promo';

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
 * Counts down to a fixed end date and never loops. `left` starts `null` so
 * server and first client paint both render nothing - the banner only
 * appears once the browser has checked the real clock, which is also what
 * keeps an expired promo from flashing on screen before it hides itself.
 */
function useCountdown(endIso: string) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = Date.parse(endIso);
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endIso]);

  return left;
}

const endDateLabel = (() => {
  const d = new Date(PROMO_END);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
})();

export function PromoBanner() {
  const secondsLeft = useCountdown(PROMO_END);

  if (!PROMO_ENABLED) return null;
  // Unknown (still mounting) or already over: render nothing.
  if (secondsLeft === null || secondsLeft <= 0) return null;

  const countdown = format(secondsLeft);

  return (
    <div
      style={{ backgroundColor: '#0b3f37' }}
      aria-label={`Actie eindigt op ${endDateLabel}`}
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
