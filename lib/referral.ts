import { randomInt } from 'node:crypto';
import type { Types } from 'mongoose';
import connectMongoDB from './mongodb';
import User from '../models/User';
import { TRIAL_USER_FIELDS } from './proHistory';
import {
  canReceiveCompWeek,
  claimantRefusal,
  COMP_WRITABLE_FILTER,
  compWeekEnd,
  compWeekUpdate,
  creditCapWindowStart,
  generateReferralCode,
  inviteShareText,
  inviteUrl,
  isReferralActivated,
  normaliseReferralCode,
  REFERRAL_CLAIM_WINDOW_DAYS,
  REFERRAL_CREDIT_CAP,
  REFERRAL_REWARD_DAYS,
  type ClaimRefusal,
} from './referralRules';

/**
 * "Nodig een vriend uit": the writes. Rules and the reasoning behind them are
 * in lib/referralRules.ts.
 *
 * Every write here is a targeted, conditional `updateOne` - never a `save()` on
 * a hydrated User (CLAUDE.md, data safety). The conditions are what make each
 * step happen at most once: a code is claimed once per account, and a friend's
 * activity is counted for the inviter once.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const OWNER_FIELDS = `referralCode createdAt referredBy subscribed compedProUntil subscriptionStatus ${TRIAL_USER_FIELDS}`;

type OwnerRow = {
  _id: Types.ObjectId;
  referralCode?: string | null;
  createdAt?: Date | null;
  referredBy?: Types.ObjectId | null;
  subscribed?: boolean | null;
  compedProUntil?: Date | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStartedAt?: Date | null;
  proTrialUsedAt?: Date | null;
  storePremium?: boolean | null;
  storePremiumPlatform?: string | null;
  storePremiumExpiresAt?: Date | null;
};

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** This account's code, created on first use. Retries on the (rare) collision. */
export async function ensureReferralCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode(randomInt);
    try {
      const res = await User.updateOne({ _id: userId, referralCode: null }, { $set: { referralCode: code } });
      if (res.modifiedCount === 1) return code;
      // Someone else's request set it first, or it already existed.
      const current = await User.findById(userId).select('referralCode').lean<{ referralCode?: string }>();
      if (current?.referralCode) return current.referralCode;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  throw new Error('[referral] could not allocate a code');
}

export type ReferralOverview = {
  code: string;
  url: string;
  shareText: string;
  rewardDays: number;
  /** Accounts that entered this code. */
  joined: number;
  /** Of those, the ones whose activity has been counted for this account. */
  active: number;
  /** Whether a friend's activity would add a week to this account. False for
   * paying and open-ended Pro, where a comp week would change nothing. */
  youEarn: boolean;
  /** End of this account's current comp period, if it has one. */
  proUntil: string | null;
  /** Whether this account may still enter someone else's code. */
  claim: { eligible: boolean; windowDays: number };
};

export async function referralOverview(userId: string, isPro: boolean, now = new Date()): Promise<ReferralOverview | null> {
  await connectMongoDB();
  const me = await User.findById(userId).select(OWNER_FIELDS).lean<OwnerRow>();
  if (!me) return null;

  const code = me.referralCode ?? (await ensureReferralCode(userId));
  const [joined, active] = await Promise.all([
    User.countDocuments({ referredBy: me._id }),
    User.countDocuments({ referredBy: me._id, referralCreditedAt: { $ne: null } }),
  ]);

  return {
    code,
    url: inviteUrl(code),
    shareText: inviteShareText(code),
    rewardDays: REFERRAL_REWARD_DAYS,
    joined,
    active,
    youEarn: canReceiveCompWeek(me) && !(isPro && !me.compedProUntil),
    proUntil: me.compedProUntil ? new Date(me.compedProUntil).toISOString() : null,
    claim: { eligible: claimantRefusal(me, isPro, now) === null, windowDays: REFERRAL_CLAIM_WINDOW_DAYS },
  };
}

export type ClaimResult =
  | { ok: true; proUntil: string | null }
  | { ok: false; reason: ClaimRefusal };

/**
 * Enter an invite code: link this account to its inviter and start its week
 * of Pro.
 *
 * The conditional `referredBy: null` write is the lock. Two taps racing past
 * the checks above it still only link once, and only the request that linked
 * grants the week - so nobody gets two.
 */
export async function claimReferral(
  userId: string,
  isPro: boolean,
  rawCode: unknown,
  now = new Date(),
): Promise<ClaimResult> {
  const code = normaliseReferralCode(rawCode);
  if (!code) return { ok: false, reason: 'INVALID_CODE' };

  await connectMongoDB();
  const me = await User.findById(userId).select(OWNER_FIELDS).lean<OwnerRow>();
  if (!me) return { ok: false, reason: 'INVALID_CODE' };
  if (me.referralCode === code) return { ok: false, reason: 'OWN_CODE' };

  const refusal = claimantRefusal(me, isPro, now);
  if (refusal) return { ok: false, reason: refusal };

  const inviter = await User.findOne({ referralCode: code }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!inviter) return { ok: false, reason: 'INVALID_CODE' };
  if (String(inviter._id) === userId) return { ok: false, reason: 'OWN_CODE' };

  const linked = await User.updateOne(
    {
      _id: userId,
      referredBy: null,
      createdAt: { $gte: new Date(now.getTime() - REFERRAL_CLAIM_WINDOW_DAYS * DAY_MS) },
    },
    { $set: { referredBy: inviter._id, referredByCode: code, referralClaimedAt: now } },
  );
  if (linked.modifiedCount !== 1) return { ok: false, reason: 'ALREADY_CLAIMED' };

  const granted = await User.updateOne({ _id: userId, ...COMP_WRITABLE_FILTER }, compWeekUpdate(now));
  return {
    ok: true,
    proUntil: granted.modifiedCount === 1 ? compWeekEnd(me.compedProUntil, now).toISOString() : null,
  };
}

export type ReferredFriend = {
  _id: Types.ObjectId | string;
  xp?: number | null;
  referredBy?: Types.ObjectId | null;
  referralClaimedAt?: Date | null;
  referralCreditedAt?: Date | null;
};

/**
 * Called after every XP grant. Does nothing - and costs no query - unless this
 * account was invited, has not been counted yet, and has now been active
 * enough (lib/referralRules `isReferralActivated`).
 *
 * The friend is marked counted first, conditionally, so concurrent XP grants
 * cannot reward the inviter twice. Past the cap the friend is still marked,
 * and the inviter simply gets no extra week for them.
 */
export async function creditReferrerIfActivated(
  friend: ReferredFriend,
  lessonsCompleted: number,
  now = new Date(),
): Promise<void> {
  if (!friend.referredBy || friend.referralCreditedAt) return;
  const activated = isReferralActivated({
    lessonsCompleted,
    xp: friend.xp ?? 0,
    claimedAt: friend.referralClaimedAt ?? null,
    now,
  });
  if (!activated) return;

  const recent = await User.countDocuments({
    referredBy: friend.referredBy,
    referralCreditedAt: { $gte: creditCapWindowStart(now) },
  });

  const marked = await User.updateOne(
    { _id: friend._id, referredBy: friend.referredBy, referralCreditedAt: null },
    { $set: { referralCreditedAt: now } },
  );
  if (marked.modifiedCount !== 1) return;
  if (recent >= REFERRAL_CREDIT_CAP) return;

  await User.updateOne({ _id: friend.referredBy, ...COMP_WRITABLE_FILTER }, compWeekUpdate(now));
}
