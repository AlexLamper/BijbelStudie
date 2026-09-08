import { resolveIsPro, type PremiumUserFields } from '../mobilePremium';
import type { RingId } from './catalog';

/**
 * The ring an account is given the moment it becomes Pro: the gold ring is
 * the standard for Pro, and a reader should not have to find the studio to
 * see what they paid for.
 */
export const PRO_RING: RingId = 'goud';

/** Mongo path of the stored ring choice (models/User.js). */
export const LEVENSBOOM_RING_PATH = 'levensboom.ring';

/**
 * The extra `$set` that goes with a Pro grant, or null when nothing should be
 * written.
 *
 * Fires on the false -> true transition of `resolveIsPro` only, and it is
 * deliberately that function and not the single flag a caller happens to be
 * writing: an App Store subscriber adding a Stripe subscription, an admin
 * re-granting an account that is already Pro, and every monthly renewal all
 * leave `resolveIsPro` where it was, so none of them touch the ring. A Pro
 * reader who deliberately switched back to teal would otherwise be overridden
 * every month.
 *
 * A lapse needs nothing here. The stored `goud` stays, `resolveAvatar()` draws
 * teal while the account is not entitled, and the ring comes straight back on
 * renewal (docs/levensboom-spec.md §9). Callers spread the result into the same
 * `$set` as the entitlement itself, so the two can never land separately.
 *
 * Pure: no Mongoose, so lib/subscriptionSync can report it in a dry run.
 */
export function proRingGrant(
  before: PremiumUserFields,
  after: PremiumUserFields,
): { [LEVENSBOOM_RING_PATH]: RingId } | null {
  if (resolveIsPro(before) || !resolveIsPro(after)) return null;
  return { [LEVENSBOOM_RING_PATH]: PRO_RING };
}
