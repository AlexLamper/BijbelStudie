import { BASE_URL } from './seo/constants';
import { hasHadProOrTrial, type TrialUserFields } from './proHistory';

/**
 * "Nodig een vriend uit": the rules, pure, so every edge is tested without a
 * database. The writes live in lib/referral.ts.
 *
 * A friend who signs up through someone's link gets a week of Pro straight
 * away. The one who invited them gets a week too, but only once the friend has
 * actually used the app: registration here verifies nothing (the register route
 * writes `emailVerified: false` and nothing ever flips it), so a reward for the
 * signup alone would pay out for made-up addresses.
 *
 * Both weeks are the admin comp mechanism (lib/compedPro.ts): `subscribed` plus
 * `compedProUntil`, expired by the daily sweep. One mechanism on web and app,
 * no store or Stripe involvement.
 */

export const REFERRAL_REWARD_DAYS = 7;

/** How long after creating an account a code can still be entered. Long enough
 * to install the app from the invite page and sign up there. */
export const REFERRAL_CLAIM_WINDOW_DAYS = 7;

/** How long the friend has to become active for the inviter to be rewarded. */
export const REFERRAL_ACTIVATION_WINDOW_DAYS = 30;

/** XP that counts as "actually used it" when no lesson was finished: about a
 * dozen chapters, or two studied plan days. */
export const REFERRAL_ACTIVATION_XP = 60;

/** Activations per inviter per rolling window that still earn a week. */
export const REFERRAL_CREDIT_CAP = 10;
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

export function inviteShareText(code: string): string {
  return `Ik gebruik BijbelStudie voor mijn bijbelstudie. Maak via deze link een gratis account, dan krijgen we allebei een week Pro: ${inviteUrl(code)}`;
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
 */
export function claimantRefusal(user: ClaimantFields, isPro: boolean, now: Date): ClaimRefusal | null {
  if (user.referredBy) return 'ALREADY_CLAIMED';
  const created = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  if (!Number.isFinite(created) || now.getTime() - created > REFERRAL_CLAIM_WINDOW_DAYS * DAY_MS) {
    return 'NOT_NEW_ACCOUNT';
  }
  if (isPro || hasHadProOrTrial(user) || !canReceiveCompWeek(user)) return 'ALREADY_PRO';
  return null;
}

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
