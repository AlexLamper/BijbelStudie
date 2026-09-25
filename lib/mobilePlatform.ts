/**
 * Which phone a visitor is on, and whether to point them at the native app.
 *
 * Pure and framework-free so the rules are testable (tests/mobilePlatform.test.ts)
 * and the banner component only has to feed in `navigator` values after mount.
 * Only `appLinkTarget` runs on the server (middleware): its result is a
 * redirect, not rendered HTML the client could disagree with. Everything else
 * stays client-side: a user agent read during SSR would render a banner the
 * client may disagree with.
 *
 * Store URLs come from lib/appStore.ts. Android shows nothing while
 * PLAY_STORE_URL is null; filling that constant in is the whole Android rollout.
 */
import { APP_STORE_URL, PLAY_STORE_URL } from './appStore';

export type MobileOs = 'ios' | 'android' | 'other';

export type MobileBrowser =
  /** Mobile Safari proper - the only browser that shows the Smart App Banner. */
  | 'safari'
  | 'chrome'
  | 'firefox'
  | 'edge'
  | 'opera'
  /** A WKWebView inside another app (Facebook, Instagram, Google app ...). */
  | 'in-app'
  | 'other';

export interface MobilePlatform {
  os: MobileOs;
  browser: MobileBrowser;
}

/** Store links per platform. `null` means: no promo on that platform. */
export const APP_PROMO_STORES: Record<Exclude<MobileOs, 'other'>, string | null> = {
  ios: APP_STORE_URL,
  android: PLAY_STORE_URL,
};

/**
 * Any UA containing this is our own app. The Flutter app has no WebView today;
 * if one is added, append this token to its user agent and the promo stays out.
 */
export const APP_UA_TOKEN = 'BijbelStudie';

/** Tokens in-app browsers on iOS add to (or use instead of) the Safari UA. */
const IOS_IN_APP_TOKENS =
  /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|Line\/|Snapchat|Pinterest|GSA\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview/i;

export function detectMobilePlatform(
  userAgent: string,
  maxTouchPoints = 0
): MobilePlatform {
  const ua = userAgent || '';

  if (/Android/i.test(ua)) {
    return { os: 'android', browser: detectAndroidBrowser(ua) };
  }

  const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+ asks for desktop sites and reports as a Mac. A Mac has no touch
  // screen, so more than one touch point means an iPad.
  const isIpadAsMac = /Macintosh/i.test(ua) && maxTouchPoints > 1;
  if (!isIosDevice && !isIpadAsMac) return { os: 'other', browser: 'other' };

  return { os: 'ios', browser: detectIosBrowser(ua) };
}

function detectIosBrowser(ua: string): MobileBrowser {
  if (/CriOS/i.test(ua)) return 'chrome';
  if (/FxiOS/i.test(ua)) return 'firefox';
  if (/EdgiOS/i.test(ua)) return 'edge';
  if (/OPiOS|OPT\//i.test(ua)) return 'opera';
  if (IOS_IN_APP_TOKENS.test(ua)) return 'in-app';
  // Safari carries both "Version/x" and "Safari/x". A bare WKWebView in some
  // other app has neither.
  if (/Version\/[\d.]+.*Safari\//i.test(ua)) return 'safari';
  return 'in-app';
}

function detectAndroidBrowser(ua: string): MobileBrowser {
  if (/FBAN|FBAV|FB_IAB|Instagram|; wv\)/i.test(ua)) return 'in-app';
  if (/EdgA/i.test(ua)) return 'edge';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/OPR\//i.test(ua)) return 'opera';
  if (/Chrome/i.test(ua)) return 'chrome';
  return 'other';
}

/**
 * Routes where a promo is out of place: the immersive study window, the paid
 * checkout flow and its return pages, and admin.
 */
const PROMO_EXCLUDED_PREFIXES = ['/studie', '/abonnement', '/succes', '/geannuleerd', '/beheer'];

export function isPromoExcludedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PROMO_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export interface AppPromoInput {
  userAgent: string;
  maxTouchPoints?: number;
  pathname?: string | null;
  /**
   * True when the page carries the apple-itunes-app meta tag, so Safari
   * already shows its own banner and ours would be the second one.
   */
  hasSmartAppBanner?: boolean;
}

/** The store URL to promote, or null when no promo should render. */
export function appPromoStoreUrl({
  userAgent,
  maxTouchPoints = 0,
  pathname,
  hasSmartAppBanner = true,
}: AppPromoInput): string | null {
  if (!userAgent || userAgent.includes(APP_UA_TOKEN)) return null;
  if (isPromoExcludedPath(pathname)) return null;

  const { os, browser } = detectMobilePlatform(userAgent, maxTouchPoints);
  if (os === 'other') return null;

  const url = APP_PROMO_STORES[os];
  if (!url) return null;

  if (os === 'ios' && browser === 'safari' && hasSmartAppBanner) return null;
  return url;
}

/** Crawlers that fetch a link for a preview card or an index, never a person. */
const LINK_PREVIEW_BOT =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Googlebot|bingbot|Applebot|Pinterestbot|redditbot|SkypeUriPreview|vkShare|Embedly/i;

/**
 * Where /app sends this visitor, or null to render the /app page itself
 * (bots, `?toon=1`, empty UA). Android falls back to "/" until PLAY_STORE_URL
 * is set. No maxTouchPoints server-side, so an iPad in desktop mode gets "/".
 */
export function appLinkTarget(userAgent: string, show = false): string | null {
  if (show || !userAgent || LINK_PREVIEW_BOT.test(userAgent)) return null;
  const { os } = detectMobilePlatform(userAgent);
  if (os === 'ios') return APP_STORE_URL;
  if (os === 'android' && PLAY_STORE_URL) return PLAY_STORE_URL;
  return '/';
}

/** App Store id from APP_STORE_URL, for the apple-itunes-app meta tag. */
export function appStoreIdFromUrl(url: string | null | undefined): string | null {
  const match = url?.match(/\/id(\d+)(?:[/?#]|$)/);
  return match ? match[1] : null;
}
