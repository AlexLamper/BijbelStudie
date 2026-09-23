'use client';

import React, { useState } from 'react';

/**
 * The one-time invitation to leave a public review in the store.
 *
 * WHY THIS IS ALLOWED HERE. App Store Review Guideline 5.6.1 forbids an app
 * from showing its own custom rating prompt - inside an app, only Apple's
 * `requestReview` API may ask. This is a page on bijbelstudie.io with an
 * outbound link to the App Store, which that guideline does not cover. The
 * same card inside the Flutter app WOULD be a violation, so this component
 * must never be ported there. See lib/storeReviewCta.ts.
 *
 * What it is not: it is not paid for. There is no XP, no badge and no Pro day
 * attached to following the link, and there must never be one - both stores
 * forbid compensating reviews, and a bought rating tells nobody anything. The
 * component does not even know who the reader is, so there is nothing here to
 * reward.
 *
 * Tone: one line, a link and a way out. No second ask, no reminder, no "het zou
 * ons enorm helpen". The reader has already done the favour by answering.
 */
export default function StoreReviewCard({
  url,
  storeName,
  tone = 'light',
  onDismiss,
}: {
  url: string;
  /** "App Store" or "Google Play" - decided on the server, shown verbatim. */
  storeName: string;
  tone?: 'dark' | 'light';
  onDismiss?: () => void;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const dark = tone === 'dark';
  const ink = dark ? 'text-white' : 'text-ink';
  const inkMuted = dark ? 'text-white/70' : 'text-ink-muted';
  const border = dark ? 'rgba(45,212,191,0.35)' : 'rgba(13,148,136,0.30)';

  function close() {
    setGone(true);
    onDismiss?.();
  }

  return (
    <section
      aria-label={`Beoordeling in de ${storeName}`}
      className="mt-4 rounded-xl border px-3.5 py-3"
      style={{ borderColor: border }}
    >
      <p className={`text-[13.5px] font-semibold leading-snug ${ink}`}>Dank je.</p>
      <p className={`mt-1 text-[12.5px] leading-snug ${inkMuted}`}>
        Wil je dit ook als openbare beoordeling in de {storeName} zetten? Dat helpt anderen de app te
        vinden. Het hoeft niet.
      </p>

      <div className="mt-3 flex items-center gap-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ${
            dark ? 'text-gray-900' : 'text-white'
          }`}
          style={{ backgroundColor: dark ? '#FFFFFF' : '#0D9488' }}
        >
          Beoordeling schrijven
        </a>
        <button
          type="button"
          onClick={close}
          className={`text-[12.5px] font-semibold ${inkMuted} hover:underline`}
        >
          Nee, dank je
        </button>
      </div>
    </section>
  );
}
