import { BASE_URL } from './seo/constants';
import { type TrialUserFields } from './proHistory';

/**
 * "Nodig een vriend uit": the rules, pure, so every edge is tested without a
 * database. The writes live in lib/referral.ts.
 *
 * A friend who signs up through someone's link (or types their code) gets a
 * week of Pro straight away, and so does the one who invited them - both at
 * the moment the friend's account is linked (the owner's decision of
 * 2026-11-09: "jullie krijgen allebei een week").
 *
 * Registration here verifies nothing (the register route writes
 * `emailVerified: false` and nothing ever flips it), so a reward for the signup
 * alone could pay out for made-up addresses. What keeps that small:
 * - one claim per account, ever, and only within REFERRAL_CLAIM_WINDOW_DAYS of
 *   creating it - so one new account is at most one reward for one inviter;
 * - never your own code;
 * - at most REFERRAL_CREDIT_CAP inviter weeks per rolling
 *   REFERRAL_CREDIT_CAP_WINDOW_DAYS: a farm of fake accounts buys at most four
 *   weeks a month, which is less than the effort of making them.
 *
 * Both weeks are the admin comp mechanism (lib/compedPro.ts): `subscribed` plus
 * `compedProUntil`, expired by the daily sweep. One mechanism on web and app,
 * no store or Stripe involvement. A week lands on top of time already left
 * (`compWeekUpdate` extends from the later of now and the current end), and an
 * account that pays - or has open-ended Pro - gets nothing written at all
 * (`COMP_WRITABLE_FILTER`), so nothing it pays for can be cut short.
 */

export const REFERRAL_REWARD_DAYS = 7;

/** How long after creating an account a code can still be entered. Long enough
 * to install the app from the invite page and sign up there. */
export const REFERRAL_CLAIM_WINDOW_DAYS = 7;

/**
 * How long a friend who claimed BEFORE inviter weeks moved to signup has to
 * become active for the inviter to be rewarded. Only `creditReferrerIfActivated`
 * still reads it, for those older claims.
 */
export const REFERRAL_ACTIVATION_WINDOW_DAYS = 30;

/** XP that counts as "actually used it" when no lesson was finished: about a
 * dozen chapters, or two studied plan days. */
export const REFERRAL_ACTIVATION_XP = 60;

/** Inviter weeks per rolling window. Four weeks a month, at most. */
export const REFERRAL_CREDIT_CAP = 4;
export const REFERRAL_CREDIT_CAP_WINDOW_DAYS = 30;

/** No 0/O or 1/I/L: codes get read aloud and typed over from a screenshot. */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

const CODE_PATTERN = new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`);

/** Uppercased, spaces and dashes dropped; null when it cannot be a code. */
export function normaliseReferralCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_PATTERN.test(code) ? code : null;
}

/** `randomInt(max)` returns an integer in [0, max) - `crypto.randomInt` in production. */
export function generateReferralCode(randomInt: (max: number) => number): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

export function inviteUrl(code: string): string {
  return `${BASE_URL}/uitnodiging?code=${encodeURIComponent(code)}`;
}

/**
 * The message the share sheet (and the app's WhatsApp invite) sends. "We
 * allebei" only when the inviter can actually earn a week (`youEarn`): a paying
 * Pro member, or an inviter at the monthly cap, does not, so their message
 * offers the friend's week alone.
 */
export function inviteShareText(code: string, inviterEarns = true): string {
  const reward = inviterEarns ? 'dan krijgen we allebei een week Pro' : 'dan krijg je meteen een week Pro';
  return `Ik gebruik BijbelStudie voor mijn bijbelstudie. Maak via deze link een gratis account, ${reward}: ${inviteUrl(code)}`;
}

/** The billing fields that decide whether a comp week may be written. */
export interface CompFields {
  subscribed?: boolean | null;
  compedProUntil?: Date | null;
  storePremium?: boolean | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
}

/**
 * Mongo filter for accounts a comp week may be written to: free, or already on
 * a comp that has an end date.
 *
 * Never an account with any Stripe trace, even a cancelled one: the expiry
 * sweep only revokes accounts whose `subscriptionStatus` is null
 * (COMPED_ACCESS_FILTER), and treats any Stripe trace as "paid in the
 * meantime" - so a comp written onto a former subscriber would never end.
 * Never an open-ended comp either (`subscribed` without a date: the App Store
 * review account, "Pro activeren"): writing a date would make it expire.
 */
export const COMP_WRITABLE_FILTER = {
  storePremium: { $ne: true },
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  $or: [{ subscribed: { $ne: true } }, { compedProUntil: { $ne: null } }],
};

/** `COMP_WRITABLE_FILTER` as a predicate over a loaded document. */
export function canReceiveCompWeek(user: CompFields): boolean {
  if (user.storePremium) return false;
  if (user.stripeSubscriptionId || user.subscriptionStatus) return false;
  return !user.subscribed || Boolean(user.compedProUntil);
}

/**
 * The update that adds a week: from the current comp end when that is still
 * in the future, otherwise from now. A pipeline so the extension is computed
 * from the stored value in the same write - two rewards landing together
 * stack instead of one overwriting the other.
 */
export function compWeekUpdate(now: Date, days = REFERRAL_REWARD_DAYS) {
  return [
    {
      $set: {
        subscribed: true,
        compedProUntil: {
          $add: [{ $max: [{ $ifNull: ['$compedProUntil', now] }, now] }, days * DAY_MS],
        },
      },
    },
  ];
}

/** What the loaded document would read after `compWeekUpdate`, for the response. */
export function compWeekEnd(current: Date | null | undefined, now: Date, days = REFERRAL_REWARD_DAYS): Date {
  const from = current && current.getTime() > now.getTime() ? current : now;
  return new Date(from.getTime() + days * DAY_MS);
}

export type ClaimRefusal =
  | 'INVALID_CODE'
  | 'OWN_CODE'
  | 'NOT_NEW_ACCOUNT'
  | 'ALREADY_CLAIMED'
  | 'ALREADY_PRO';

export interface ClaimantFields extends Omit<TrialUserFields, '_id'>, CompFields {
  createdAt?: Date | null;
  referredBy?: unknown;
}

/**
 * Why this account may not enter a code, or null when it may. The code itself
 * is checked separately (it needs a lookup); this is everything about the
 * person entering it.
 *
 * Having Pro is no longer a refusal. A new account that already pays (an
 * onboarding purchase) or runs a trial still links to whoever invited it - the
 * inviter earned their week either way - and simply gets no comp week written
 * for itself, because `COMP_WRITABLE_FILTER` never writes one onto a paying
 * account. A dated comp (the admin grant, or a trial given as a comp) does get
 * the week on top. `ALREADY_PRO` stays in the type for clients that know it.
 */
export function claimantRefusal(user: ClaimantFields, _isPro: boolean, now: Date): ClaimRefusal | null {
  if (user.referredBy) return 'ALREADY_CLAIMED';
  const created = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  if (!Number.isFinite(created) || now.getTime() - created > REFERRAL_CLAIM_WINDOW_DAYS * DAY_MS) {
    return 'NOT_NEW_ACCOUNT';
  }
  return null;
}

/** What the friend reads after a claim that linked but could not add a week. */
export const CLAIM_LINKED_NO_WEEK_MESSAGE =
  'Gelukt, je bent gekoppeld aan je vriend. Je hebt al Pro, dus voor jou komt er geen week bij.';

/** Dutch, for the web card and the app alike. */
export const CLAIM_REFUSAL_MESSAGES: Record<ClaimRefusal, string> = {
  INVALID_CODE: 'Deze code klopt niet. Controleer hem en probeer het opnieuw.',
  OWN_CODE: 'Dit is je eigen code. Deel hem met een vriend.',
  NOT_NEW_ACCOUNT: 'Een uitnodigingscode kun je invullen in de eerste week na het aanmaken van je account.',
  ALREADY_CLAIMED: 'Je hebt al een uitnodigingscode gebruikt.',
  ALREADY_PRO: 'Je hebt al Pro gehad, dus de gratis week is niet voor dit account.',
};

export interface ActivationInput {
  lessonsCompleted: number;
  xp: number;
  claimedAt?: Date | null;
  now: Date;
}

/** Has the invited friend used the app enough, soon enough, to reward the inviter? */
export function isReferralActivated({ lessonsCompleted, xp, claimedAt, now }: ActivationInput): boolean {
  if (!claimedAt) return false;
  if (now.getTime() - new Date(claimedAt).getTime() > REFERRAL_ACTIVATION_WINDOW_DAYS * DAY_MS) return false;
  return lessonsCompleted >= 1 || xp >= REFERRAL_ACTIVATION_XP;
}

export function creditCapWindowStart(now: Date): Date {
  return new Date(now.getTime() - REFERRAL_CREDIT_CAP_WINDOW_DAYS * DAY_MS);
}
