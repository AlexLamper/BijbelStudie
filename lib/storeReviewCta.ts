/**
 * The outbound "leave a review in the store" link, and who gets which one.
 *
 * WHY THIS IS ALLOWED ON THE WEB AND FORBIDDEN IN THE APP
 * ------------------------------------------------------
 * App Store Review Guideline 5.6.1 bans an app from putting its own custom
 * review prompt in front of a user: inside an app, asking for a rating is only
 * permitted through Apple's `SKStoreReviewController`/`requestReview` API. That
 * rule is about what an APP may show. This module is a web page on
 * bijbelstudie.io linking out to the App Store, which is an ordinary outbound
 * link and is not covered by 5.6.1.
 *
 * So: this card may exist here and must NEVER be ported into the Flutter app.
 * The app asks through the system API or it does not ask at all.
 *
 * And never for a reward. No XP, no badge, no Pro days, not now and not as a
 * "small thank you" later: both stores forbid compensating reviews, and a
 * bought rating is worth less than no rating because it stops telling you
 * anything. There is deliberately nothing in this file that a reward could be
 * hung on.
 *
 * Android is a one-line flip: set `PLAY_STORE_URL` in lib/appStore.ts and an
 * Android reader starts getting the Play link here. Until then they get
 * nothing rather than a link to a store their phone cannot use.
 */

import { APP_STORE_URL, PLAY_STORE_URL } from './appStore';
import { appStoreIdFromUrl } from './mobilePlatform';

/** Which store this reader could actually review in. */
export type StorePlatform = 'apple' | 'android';

/**
 * The App Store id, derived from the one URL that has it. A second copy of
 * "6800668187" in this file would be a second thing to get wrong.
 */
export const APP_STORE_ID = appStoreIdFromUrl(APP_STORE_URL);

/**
 * Apple's documented deep link straight into the review sheet on the product
 * page. Null only if the constant it is built from ever stops carrying an id.
 */
export const APP_STORE_REVIEW_URL: string | null = APP_STORE_ID
  ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
  : null;

/**
 * Play has no write-review deep link on the web; the listing's review section
 * is the destination. Null while Android is unshipped.
 */
export const PLAY_STORE_REVIEW_URL: string | null = PLAY_STORE_URL
  ? `${PLAY_STORE_URL}${PLAY_STORE_URL.includes('?') ? '&' : '?'}showAllReviews=true`
  : null;

/** Dutch, and the store's own name, so the button says where it goes. */
export const STORE_NAMES: Record<StorePlatform, string> = {
  apple: 'App Store',
  android: 'Google Play',
};

/**
 * Which store a web visitor belongs to.
 *
 * Only Android is detected positively. Everything else - iPhone, iPad, Mac,
 * Windows, an unknown crawler - falls to Apple, because the App Store is the
 * only store the app is in and a desktop reader may well carry an iPhone.
 */
export function storePlatformFromUserAgent(userAgent: string | null | undefined): StorePlatform {
  return /Android/i.test(userAgent ?? '') ? 'android' : 'apple';
}

export interface StoreReviewTarget {
  url: string;
  /** "App Store" or "Google Play", for the link label. */
  storeName: string;
}

/** Where to send this reader, or null when that store has nothing to review. */
export function storeReviewTarget(platform: StorePlatform): StoreReviewTarget | null {
  const url = platform === 'android' ? PLAY_STORE_REVIEW_URL : APP_STORE_REVIEW_URL;
  return url ? { url, storeName: STORE_NAMES[platform] } : null;
}

/** The same decision straight from a user agent string. */
export function storeReviewTargetFor(userAgent: string | null | undefined): StoreReviewTarget | null {
  return storeReviewTarget(storePlatformFromUserAgent(userAgent));
}
