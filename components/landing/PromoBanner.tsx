'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PROMO_ENABLED, PROMO_LINK, PRO_TRIAL_DAYS } from '../../lib/promo';

/**
 * The landing page's line about the free Pro trial.
 *
 * NO COUNTDOWN. The trial is offered to every account that never had Pro, all
 * year round (lib/promo.ts), so "Actie eindigt over ..." would announce a
 * deadline that does not exist - a banned practice under UCPD Annex I, point 7.
 * The banner says what is true: the first days are free, once per account.
 */
export function PromoBanner() {
  if (!PROMO_ENABLED) return null;

  return (
    <div style={{ backgroundColor: '#0b3f37' }} aria-label={`BijbelStudie Pro ${PRO_TRIAL_DAYS} dagen gratis`}>
      {/* Desktop / tablet: one row. */}
      <div
        className="mx-auto hidden max-w-[1440px] items-center justify-center gap-5 px-4 text-[15px] md:flex"
        style={{ height: 48 }}
      >
        <span>
          <strong className="font-extrabold text-white">BijbelStudie Pro {PRO_TRIAL_DAYS} dagen gratis</strong>
          <span style={{ color: '#a9d8ca' }}> · alle commentaren en de grondtekst</span>
        </span>
        <span aria-hidden style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
        <span className="text-sm" style={{ color: '#a9d8ca' }}>
          Eén keer per account, opzeggen wanneer je wilt
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
          <strong className="font-extrabold text-white">Pro {PRO_TRIAL_DAYS} dagen gratis</strong>
          <span style={{ color: '#a9d8ca' }}> · alle commentaren en de grondtekst</span>
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
