/**
 * Where the mobile app lives, once, for every surface that links to it.
 *
 * The landing page had this URL inline; the sidebar now links to it too, and a
 * wrong or stale id in one of them is a dead end for the reader rather than a
 * visible bug. One constant.
 *
 * The reverse direction is forbidden: the APP must never link to web checkout
 * (StoreKit is its own pricing truth - see lib/pricing.ts and CLAUDE.md). This
 * file is web → store only.
 */

/** Live on the App Store since August 2026. */
export const APP_STORE_URL =
  'https://apps.apple.com/us/app/bijbelstudie-lees-leer/id6800668187';

/**
 * Live in Google Play since 17 October 2026.
 *
 * Kept in the bare `…/store/apps/details?id=<package>` form on purpose: no
 * `&hl=`, no `&pli=`, no referrer parameters. `lib/storeReviews.ts` reads the
 * `id` param to derive the Play package name, and `lib/storeReviewCta.ts`
 * appends `&showAllReviews=true` to it, so anything extra in here ends up in
 * both of those.
 */
export const PLAY_STORE_URL: string | null =
  'https://play.google.com/store/apps/details?id=com.bijbelstudie.app';
