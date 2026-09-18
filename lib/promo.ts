/**
 * The hero promo banner's config: a real, fixed end date for a real action.
 * Both are `NEXT_PUBLIC_*` because PromoBanner reads them client-side to
 * drive the countdown - set them in Vercel project env, not hardcoded deep in
 * the component. Flip `NEXT_PUBLIC_PROMO_ENABLED=false` to switch the whole
 * banner off without touching the end date.
 */
export const PROMO_ENABLED = process.env.NEXT_PUBLIC_PROMO_ENABLED !== 'false';

/** ISO 8601 with an explicit offset, so it parses the same in every timezone. */
export const PROMO_END =
  process.env.NEXT_PUBLIC_PROMO_END ?? '2026-09-30T23:59:00+02:00';

/** Where "Probeer Pro" and the banner's tap target go. */
export const PROMO_LINK = '/abonnement';
