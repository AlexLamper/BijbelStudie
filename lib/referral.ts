import { randomInt } from 'node:crypto';
import type { Types } from 'mongoose';
import connectMongoDB from './mongodb';
import User from '../models/User';
import { TRIAL_USER_FIELDS } from './proHistory';
import {
  canReceiveCompWeek,
  CLAIM_LINKED_NO_WEEK_MESSAGE,
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
  /** Whether a friend joining now would add a week to this account. False for
   * paying and open-ended Pro, where a comp week would change nothing, and
   * while the monthly cap on inviter weeks is reached. */
  youEarn: boolean;
  /** End of this account's current comp period, if it has one. */
  proUntil: string | null;
  /** Which invite line the card shows, decided here from the server's Pro
   * state so web and app agree: 'gift' for Pro members (paying, trial, comp),
   * who give the week; 'offer' for everyone else. */
  copyVariant: 'gift' | 'offer';
  /** Whether this account may still enter someone else's code. */
  claim: { eligible: boolean; windowDays: number };
};

export async function referralOverview(userId: string, isPro: boolean, now = new Date()): Promise<ReferralOverview | null> {
  await connectMongoDB();
  const me = await User.findById(userId).select(OWNER_FIELDS).lean<OwnerRow>();
  if (!me) return null;

  const code = me.referralCode ?? (await ensureReferralCode(userId));
  const [joined, active, recentCredits] = await Promise.all([
    User.countDocuments({ referredBy: me._id }),
    User.countDocuments({ referredBy: me._id, referralCreditedAt: { $ne: null } }),
    User.countDocuments({ referredBy: me._id, referralCreditedAt: { $gte: creditCapWindowStart(now) } }),
  ]);

  const youEarn =
    canReceiveCompWeek(me) && !(isPro && !me.compedProUntil) && recentCredits < REFERRAL_CREDIT_CAP;
  return {
    code,
    url: inviteUrl(code),
    shareText: inviteShareText(code, youEarn),
    rewardDays: REFERRAL_REWARD_DAYS,
    joined,
    active,
    youEarn,
    proUntil: me.compedProUntil ? new Date(me.compedProUntil).toISOString() : null,
    copyVariant: isPro ? 'gift' : 'offer',
    claim: { eligible: claimantRefusal(me, isPro, now) === null, windowDays: REFERRAL_CLAIM_WINDOW_DAYS },
  };
}

export type ClaimResult =
  | {
      ok: true;
      /** The friend's new comp end, or null when no week could be written (a paying account). */
      proUntil: string | null;
      /** Whether the friend got a week. */
      granted: boolean;
      /** Whether the inviter got a week for this signup. */
      inviterRewarded: boolean;
      /** Dutch, for a client that shows the server's own line. */
      message: string;
    }
  | { ok: false; reason: ClaimRefusal };

/**
 * Enter an invite code: link this account to its inviter and start the week
 * of Pro - for both of them.
 *
 * The conditional `referredBy: null` write is the lock. Two taps racing past
 * the checks above it still only link once, and only the request that linked
 * grants anything - so nobody gets two weeks for one signup.
 *
 * Interaction with a trial every new account may already have: the friend's
 * week goes through the comp path, which extends from the later of now and an
 * existing comp end. A trial given as a comp therefore grows by the week (3
 * days become 10); a trial held anywhere else runs side by side with the comp,
 * so the friend has Pro for at least the full week from the claim either way -
 * it never shrinks to the trial's length.
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
  const inviterRewarded = await rewardInviter(userId, inviter._id, now);
  const friendGotWeek = granted.modifiedCount === 1;
  return {
    ok: true,
    proUntil: friendGotWeek ? compWeekEnd(me.compedProUntil, now).toISOString() : null,
    granted: friendGotWeek,
    inviterRewarded,
    message: friendGotWeek ? 'Je week Pro is gestart.' : CLAIM_LINKED_NO_WEEK_MESSAGE,
  };
}

/**
 * The inviter's week for one friend's signup, at most REFERRAL_CREDIT_CAP a
 * rolling month.
 *
 * The friend is marked credited FIRST, conditionally, and the window is counted
 * after - including this friend. Two signups racing each other can then only
 * under-reward (both see the other and both may land over the cap), never pay
 * out a fifth week. Past the cap the friend stays marked, so a later activity
 * check (`creditReferrerIfActivated`) does not pay for them either.
 */
async function rewardInviter(friendId: string | Types.ObjectId, inviterId: Types.ObjectId, now: Date): Promise<boolean> {
  const marked = await User.updateOne(
    { _id: friendId, referredBy: inviterId, referralCreditedAt: null },
    { $set: { referralCreditedAt: now } },
  );
  if (marked.modifiedCount !== 1) return false;

  const recent = await User.countDocuments({
    referredBy: inviterId,
    referralCreditedAt: { $gte: creditCapWindowStart(now) },
  });
  if (recent > REFERRAL_CREDIT_CAP) return false;

  const rewarded = await User.updateOne({ _id: inviterId, ...COMP_WRITABLE_FILTER }, compWeekUpdate(now));
  return rewarded.modifiedCount === 1;
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
 * Since inviter weeks moved to the moment of signup (`claimReferral`) every new
 * claim is credited at once, so this only still pays for friends who claimed
 * before that change and had not been active enough yet. Same cap, same
 * mark-first order (`rewardInviter`).
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
  await rewardInviter(friend._id, friend.referredBy, now);
}
