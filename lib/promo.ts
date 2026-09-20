/**
 * The hero promo banner's config: a recurring, genuinely intermittent action.
 *
 * The offer runs for `PROMO_ACTIVE_DAYS` out of every `PROMO_CYCLE_DAYS` - one
 * week on, one week off - on a fixed schedule derived from `PROMO_CYCLE_ANCHOR`.
 * No state is stored anywhere: every caller computes the same window from the
 * clock, so server, client and Stripe always agree on whether the action is
 * running right now.
 *
 * Why the off-weeks matter: the banner says "Actie eindigt over ...". Under the
 * EU Omnibus rules (UCPD Annex I, point 7) advertising a deadline for an offer
 * that in fact never stops is a banned practice, regardless of intent. This
 * schedule stays on the right side of that line only because the trial really
 * is unavailable in the off-weeks - `app/api/checkout` asks Stripe for the
 * trial exclusively while `isPromoActive()` is true. Do not "simplify" this by
 * leaving the trial permanently on while keeping the countdown on screen.
 *
 * The `NEXT_PUBLIC_*` names are read client-side by PromoBanner, so set them in
 * Vercel project env rather than hardcoding deep in a component. Flip
 * `NEXT_PUBLIC_PROMO_ENABLED=false` to switch the whole thing off.
 */
export const PROMO_ENABLED = process.env.NEXT_PUBLIC_PROMO_ENABLED !== 'false';

/**
 * Start of one active window; every other window is derived from it.
 *
 * ISO 8601 with an explicit offset so it parses identically in every timezone.
 * A Monday 00:00 Amsterdam, which makes each action run Monday -> Monday. The
 * cycle is counted in exact 24h days, so after a DST switch the local start
 * time shifts by an hour (00:00 -> 23:00 the evening before). Cosmetic only.
 */
export const PROMO_CYCLE_ANCHOR =
  process.env.NEXT_PUBLIC_PROMO_CYCLE_ANCHOR ?? '2026-09-14T00:00:00+02:00';

/** Days the action runs, from the start of each cycle. */
export const PROMO_ACTIVE_DAYS = Number(
  process.env.NEXT_PUBLIC_PROMO_ACTIVE_DAYS ?? 7,
);

/**
 * Length of the full cycle in days. 14 with 7 active days = one week on, one
 * week off. Must be greater than `PROMO_ACTIVE_DAYS`; if it is equal or less
 * the action would never stop, which is exactly the misleading-deadline case
 * above, so `promoWindow` refuses to treat such a config as running.
 */
export const PROMO_CYCLE_DAYS = Number(
  process.env.NEXT_PUBLIC_PROMO_CYCLE_DAYS ?? 14,
);

/** Where "Probeer Pro" and the banner's tap target go. */
export const PROMO_LINK = '/abonnement';

/**
 * Length of the free trial the banner promises, in days.
 *
 * This is the *only* place the number 7 is decided. `app/api/checkout` passes it
 * to Stripe as `subscription_data.trial_period_days`, so the claim on the banner
 * and what Stripe actually does cannot drift apart. Changing it here changes
 * both.
 */
export const PRO_TRIAL_DAYS = 7;

const DAY_MS = 86_400_000;

export type PromoWindow = {
  /** Is the action running at `now`? */
  active: boolean;
  /** When the current active window ends. Only meaningful while `active`. */
  endsAt: number;
  /** When the next active window opens. Only meaningful while not `active`. */
  nextStartsAt: number;
};

const OFF: PromoWindow = { active: false, endsAt: 0, nextStartsAt: 0 };

/**
 * The action's state at `now`, computed from the fixed cycle.
 *
 * Pure and deterministic - the same `now` always yields the same window, on the
 * server and in the browser, which is what lets the countdown, the point-of-sale
 * copy and the Stripe call agree without sharing state.
 */
export function promoWindow(now: number = Date.now()): PromoWindow {
  if (!PROMO_ENABLED) return OFF;

  const anchor = Date.parse(PROMO_CYCLE_ANCHOR);
  if (!Number.isFinite(anchor)) return OFF;

  const cycleMs = PROMO_CYCLE_DAYS * DAY_MS;
  const activeMs = PROMO_ACTIVE_DAYS * DAY_MS;
  // A cycle that is never off would make the countdown a false deadline.
  if (!(activeMs > 0) || !(cycleMs > activeMs)) return OFF;

  // Works for dates before the anchor too: JS `%` keeps the sign, so shift back
  // into range rather than landing on a negative offset.
  let offset = (now - anchor) % cycleMs;
  if (offset < 0) offset += cycleMs;

  const cycleStart = now - offset;
  return {
    active: offset < activeMs,
    endsAt: cycleStart + activeMs,
    nextStartsAt: cycleStart + cycleMs,
  };
}

/**
 * Whether the action is running right now. The checkout route gates the Stripe
 * trial on this, so the deadline the banner prints is the real deadline.
 *
 * Server and client both call this; pass `now` in tests.
 */
export function isPromoActive(now: number = Date.now()): boolean {
  return promoWindow(now).active;
}
