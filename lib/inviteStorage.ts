import { normaliseReferralCode } from './referralRules';

/**
 * The invite code from /uitnodiging, kept in this browser until there is an
 * account to use it on (components/referral/ReferralClaim.tsx).
 *
 * localStorage rather than a cookie: only the browser ever reads it, and it
 * survives the round trip through Google sign-in on the same origin. Every
 * access is guarded - private mode and blocked storage throw.
 */

const KEY = 'bs_invite_code';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function rememberInviteCode(code: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Storage unavailable: the page still shows the code to type in.
  }
}

export function readInviteCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: unknown; at?: unknown };
    const code = normaliseReferralCode(parsed.code);
    if (!code || typeof parsed.at !== 'number' || Date.now() - parsed.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function forgetInviteCode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up.
  }
}
