import connectMongoDB from './mongodb';
import User from '../models/User';
import DailyAllowance from '../models/DailyAllowance';
import AnalyticsEvent from '../models/AnalyticsEvent';
import { COMPED_ACCESS_FILTER } from './billingFilters';
import { COMP_WRITABLE_FILTER } from './referralRules';
import { sanitizeProps, type EventName } from './analyticsSchema';
import { REVERSE_TRIAL_DAYS, TINY_TTS_DAILY_CHARS, type TrialUsage } from './entitlements';
import {
  amsterdamDay,
  isCountingUsage,
  isNothing,
  planTouch,
  type ReverseTrialFields,
  type TouchPlan,
  type TrialAccountFields,
} from './reverseTrialRules';

/**
 * The reverse trial's writes. The rules - when a day counts, what the top
 * feature is, which limits apply - are pure, in lib/reverseTrialRules.ts and
 * lib/entitlements.ts; this file only applies them to the database.
 *
 * Everything here is bookkeeping on the side of a request, so nothing throws:
 * a failed write means a day or a count is recorded on the next request
 * instead, never that a reader's page or answer fails.
 */

const LAST_DAY_INDEX = `reverseTrial.days.${REVERSE_TRIAL_DAYS - 1}`;

async function serverEvent(
  name: EventName,
  userId: unknown,
  props: Record<string, unknown>,
): Promise<void> {
  try {
    await AnalyticsEvent.create({ name, userId, props: sanitizeProps(name, props), occurredAt: new Date() });
  } catch (error) {
    console.error(`[reverseTrial] event ${name} failed`, error);
  }
}

export type TouchPlatform = 'web' | 'ios' | 'android' | null;

/**
 * Applies [planTouch] for one visit. Returns the plan so the caller can patch
 * the account it already holds (`applyTouch`) instead of reading it again.
 * Costs no query at all unless something is due - once per active day.
 */
export async function touchReverseTrial(
  account: TrialAccountFields & { _id: unknown },
  options: { now?: Date; platform?: TouchPlatform } = {},
): Promise<TouchPlan> {
  const now = options.now ?? new Date();
  const plan = planTouch(account, now);
  if (isNothing(plan)) return plan;

  const _id = account._id;
  const platform = options.platform ?? undefined;
  try {
    await connectMongoDB();

    if (plan.start && plan.addDay) {
      const started = await User.updateOne(
        { _id, 'reverseTrial.startedAt': { $exists: false } },
        {
          $set: {
            'reverseTrial.startedAt': now,
            'reverseTrial.days': [plan.addDay],
            'reverseTrial.origin': plan.origin ?? 'new',
            ...(plan.endsAt ? { 'reverseTrial.endsAt': plan.endsAt } : {}),
          },
        },
      );
      if (started.modifiedCount === 1) {
        void serverEvent('reverse_trial_started', _id, { platform, origin: plan.origin ?? 'new' });
      }
    } else if (plan.addDay) {
      await User.updateOne(
        {
          _id,
          'reverseTrial.startedAt': { $exists: true },
          'reverseTrial.days': { $ne: plan.addDay },
          [LAST_DAY_INDEX]: { $exists: false },
        },
        {
          $push: { 'reverseTrial.days': plan.addDay },
          ...(plan.endsAt ? { $set: { 'reverseTrial.endsAt': plan.endsAt } } : {}),
        },
      );
    }

    if (plan.grantUntil) {
      // `$max` with the stored value: a referral week or an admin month that
      // runs longer is never shortened by the trial.
      await User.updateOne({ _id, ...COMP_WRITABLE_FILTER }, [
        {
          $set: {
            subscribed: true,
            compedProUntil: { $max: ['$compedProUntil', plan.grantUntil] },
          },
        },
      ]);
    }

    if (plan.finalise) {
      const closed = await User.updateOne(
        { _id, 'reverseTrial.endedAt': { $exists: false } },
        {
          $set: {
            'reverseTrial.endedAt': now,
            'reverseTrial.topFeature': plan.finalise.topFeature,
          },
        },
      );
      if (closed.modifiedCount === 1) {
        void serverEvent('reverse_trial_ended', _id, { feature: plan.finalise.topFeature ?? 'none', platform });
      }
    }

    if (plan.revoke) {
      // Only an account that is still nothing but a comp, and only once its
      // date has passed - the same guard as the daily sweep in lib/compedPro.ts.
      await User.updateOne(
        { _id, ...COMPED_ACCESS_FILTER, compedProUntil: { $ne: null, $lte: now } },
        { $set: { subscribed: false, compedProUntil: null } },
      );
    }
  } catch (error) {
    console.error('[reverseTrial] touch failed', error);
  }
  return plan;
}

/** Filter: this account's trial is running and may be counted. */
function countingFilter(userId: unknown, now: Date) {
  return {
    _id: userId,
    'reverseTrial.startedAt': { $exists: true },
    'reverseTrial.endedAt': { $exists: false },
    $or: [{ [LAST_DAY_INDEX]: { $exists: false } }, { 'reverseTrial.endsAt': { $gt: now } }],
  };
}

/**
 * Counts one use of a feature while the trial runs. Pass the trial when the
 * caller already holds it: an account outside its trial then costs no query.
 */
export async function recordTrialUsage(
  userId: unknown,
  field: keyof TrialUsage,
  trial?: ReverseTrialFields | null,
  amount = 1,
): Promise<void> {
  if (!userId) return;
  const now = new Date();
  if (trial !== undefined && !isCountingUsage(trial, now)) return;
  try {
    await connectMongoDB();
    await User.updateOne(countingFilter(userId, now), { $inc: { [`reverseTrial.usage.${field}`]: amount } });
  } catch (error) {
    console.error('[reverseTrial] usage failed', error);
  }
}

/** "Je Pro-dagen zitten erop" was shown. Once per account, whichever client showed it. */
export async function markRecapSeen(userId: unknown, platform?: TouchPlatform): Promise<boolean> {
  await connectMongoDB();
  const result = await User.updateOne(
    { _id: userId, 'reverseTrial.endedAt': { $exists: true }, 'reverseTrial.recapSeenAt': { $exists: false } },
    { $set: { 'reverseTrial.recapSeenAt': new Date() } },
  );
  const first = result.modifiedCount === 1;
  if (first) void serverEvent('trial_recap_shown', userId, { platform: platform ?? undefined });
  return first;
}

/** "Je hebt 3 dagen Pro gekregen" was shown. Once per account, whichever client showed it. */
export async function markAnnounceSeen(userId: unknown, platform?: TouchPlatform): Promise<boolean> {
  await connectMongoDB();
  const result = await User.updateOne(
    { _id: userId, 'reverseTrial.origin': 'existing', 'reverseTrial.announceSeenAt': { $exists: false } },
    { $set: { 'reverseTrial.announceSeenAt': new Date() } },
  );
  const first = result.modifiedCount === 1;
  if (first) void serverEvent('trial_announcement_shown', userId, { platform: platform ?? undefined });
  return first;
}

/* -------------------------------- allowances ------------------------------- */

export type AllowanceFeature = 'study' | 'audio' | 'studies';

export interface AllowanceClaim {
  allowed: boolean;
  /** Distinct things opened today, this one included when allowed. */
  used: number;
  cap: number;
}

const ALLOWANCE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 11000);
}

/** Normalised key: lower-case, no spaces, bounded - it comes partly from a client. */
export function allowanceKey(...parts: Array<string | number>): string {
  return parts
    .map((p) => String(p).trim().toLowerCase().replace(/\s+/g, '-'))
    .join(':')
    .slice(0, 120);
}

/**
 * Takes one of today's [cap] slots for [key], atomically. The same key again
 * on the same day is free - reopening a chapter, replaying a track - so the cap
 * counts distinct things. A full day answers `allowed: false`.
 *
 * The upsert carries the "still room, or already mine" condition in its
 * filter; when a row exists and the condition fails, the insert it falls back
 * to hits the unique index - which is the refusal, not an error.
 */
export async function claimAllowance(
  userId: unknown,
  feature: AllowanceFeature,
  key: string,
  cap: number,
  now = new Date(),
): Promise<AllowanceClaim> {
  if (cap <= 0) return { allowed: false, used: 0, cap: 0 };
  await connectMongoDB();
  const day = amsterdamDay(now);
  try {
    const doc = await DailyAllowance.findOneAndUpdate(
      { userId, day, feature, $or: [{ keys: key }, { [`keys.${cap - 1}`]: { $exists: false } }] },
      {
        $addToSet: { keys: key },
        $setOnInsert: { expireAt: new Date(now.getTime() + ALLOWANCE_TTL_MS) },
      },
      { upsert: true, new: true },
    ).lean<{ keys?: string[] }>();
    return { allowed: true, used: doc?.keys?.length ?? 1, cap };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const doc = await DailyAllowance.findOne({ userId, day, feature }).lean<{ keys?: string[] }>();
    return { allowed: false, used: doc?.keys?.length ?? cap, cap };
  }
}

/** Today's use of an allowance, without taking anything. */
export async function allowanceToday(
  userId: unknown,
  feature: AllowanceFeature,
  now = new Date(),
): Promise<{ used: number; keys: string[] }> {
  await connectMongoDB();
  const doc = await DailyAllowance.findOne({ userId, day: amsterdamDay(now), feature }).lean<{ keys?: string[] }>();
  return { used: doc?.keys?.length ?? 0, keys: doc?.keys ?? [] };
}

/**
 * Spends [chars] of today's natural-voice ceiling (TINY_TTS_DAILY_CHARS).
 * Called after `claimAllowance` succeeded, so today's row exists.
 */
export async function spendTtsChars(userId: unknown, chars: number, now = new Date()): Promise<boolean> {
  await connectMongoDB();
  const result = await DailyAllowance.updateOne(
    { userId, day: amsterdamDay(now), feature: 'audio', chars: { $lte: TINY_TTS_DAILY_CHARS - chars } },
    { $inc: { chars } },
  );
  return result.modifiedCount === 1;
}
