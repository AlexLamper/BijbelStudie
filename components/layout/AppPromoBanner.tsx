'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  appPromoStoreUrl,
  detectMobilePlatform,
  isPromoExcludedPath,
  type MobileOs,
} from '../../lib/mobilePlatform';

/**
 * Points phone visitors at the native app.
 *
 * iOS Safari gets Apple's own Smart App Banner from the apple-itunes-app meta
 * tag in app/layout.tsx, so this card only appears where that banner cannot:
 * Chrome/Firefox/Edge on iOS and in-app browsers. Android stays silent until
 * PLAY_STORE_URL in lib/appStore.ts is set. Rules live in lib/mobilePlatform.ts.
 *
 * Renders nothing on the server and on the first client render, so markup
 * always matches during hydration; it is fixed-positioned, so appearing after
 * mount never shifts the page.
 */

const DISMISS_KEY = 'bijbelstudie-app-promo-dismissed';
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

const COPY: Record<Exclude<MobileOs, 'other'>, { subtitle: string; button: string }> = {
  ios: { subtitle: 'Studeer verder op je iPhone of iPad', button: 'Openen in App Store' },
  android: { subtitle: 'Studeer verder op je telefoon', button: 'Openen in Google Play' },
};

function dismissedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode or blocked storage: it just shows again next visit.
  }
}

export default function AppPromoBanner() {
  const pathname = usePathname();
  const [promo, setPromo] = useState<{ url: string; os: Exclude<MobileOs, 'other'> } | null>(null);

  useEffect(() => {
    if (dismissedRecently()) {
      setPromo(null);
      return;
    }
    const userAgent = navigator.userAgent;
    const maxTouchPoints = navigator.maxTouchPoints ?? 0;
    const url = appPromoStoreUrl({
      userAgent,
      maxTouchPoints,
      pathname,
      hasSmartAppBanner: Boolean(
        document.querySelector('meta[name="apple-itunes-app"]')
      ),
    });
    const { os } = detectMobilePlatform(userAgent, maxTouchPoints);
    setPromo(url && os !== 'other' ? { url, os } : null);
  }, [pathname]);

  if (!promo || isPromoExcludedPath(pathname)) return null;
  const copy = COPY[promo.os];

  const dismiss = () => {
    rememberDismiss();
    setPromo(null);
  };

  return (
    <div
      role="region"
      aria-label="BijbelStudie-app"
      className="fixed inset-x-0 bottom-0 z-[150] px-3 pt-2"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <Image
          src="/app-icon.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              BijbelStudie-app
            </p>
            <p className="text-xs leading-snug text-slate-600 dark:text-slate-400">
              {copy.subtitle}
            </p>
          </div>
          <a
            href={promo.url}
            rel="noopener noreferrer"
            data-track={promo.os === 'ios' ? 'mobile_banner_appstore' : 'mobile_banner_playstore'}
            className="self-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-white sm:self-auto"
            style={{ backgroundColor: '#0D9488' }}
          >
            {copy.button}
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Sluiten"
          className="-mr-1 shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
