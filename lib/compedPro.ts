import connectMongoDB from "./mongodb";
import User from "../models/User";
import { COMPED_ACCESS_FILTER, STRIPE_GRANTED_FILTER } from "./billingFilters";

/**
 * Time-limited Pro grants ("1 maand Pro cadeau" in /beheer/gebruikers).
 *
 * A grant writes `subscribed: true` plus `compedProUntil`. Nothing reads the
 * date at request time on purpose: `subscribed` is checked in dozens of places
 * with dozens of different `select()`s, and adding a second field to all of them
 * is how one of them ends up disagreeing. Instead the grant expires by a daily
 * sweep, so the account is Pro for at most a day longer than promised and every
 * existing entitlement check keeps working unchanged.
 *
 * When the period ends the account simply drops to free. It never becomes a
 * Stripe customer and is never charged - paying is a choice the reader makes
 * afterwards, through the normal checkout.
 */

export const MAX_COMP_MONTHS = 12;

/** The end of a grant of [months] whole months from [from]. */
export function compedProExpiry(months: number, from: Date = new Date()): Date {
  const end = new Date(from.getTime());
  end.setMonth(end.getMonth() + months);
  return end;
}

export interface CompExpirySweep {
  /** Grants that ran out: dropped back to free. */
  revoked: number;
  /** Grants on accounts that started paying in the meantime: date dropped, Pro kept. */
  cleared: number;
}

/**
 * Ends every grant whose date has passed.
 *
 * Only an account that is still comped loses access. If the reader bought Pro
 * during the free month - through Stripe or the App Store - the date is cleared
 * and `subscribed` is left exactly where the paid flow put it, so the sweep can
 * never revoke something someone is being billed for.
 */
export async function expireCompedPro(now: Date = new Date()): Promise<CompExpirySweep> {
  await connectMongoDB();

  const paidInTheMeantime = await User.updateMany(
    {
      compedProUntil: { $ne: null },
      $or: [{ storePremium: true }, ...STRIPE_GRANTED_FILTER.$or],
    },
    { $set: { compedProUntil: null } },
  );

  const lapsed = await User.updateMany(
    { ...COMPED_ACCESS_FILTER, compedProUntil: { $ne: null, $lte: now } },
    { $set: { subscribed: false, compedProUntil: null } },
  );

  return {
    revoked: lapsed.modifiedCount ?? 0,
    cleared: paidInTheMeantime.modifiedCount ?? 0,
  };
}
