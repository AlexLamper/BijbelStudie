/**
 * Password-reset tokens.
 *
 * The token goes out in a link; only its SHA-256 hash is stored. A reset token
 * is a password equivalent for as long as it lives, so a leaked database dump
 * must not hand out account takeovers - and unlike a password, the raw value
 * exists in the user's inbox anyway, so there is nothing to gain by keeping it
 * server-side.
 *
 * SHA-256 rather than bcrypt on purpose: the input is 32 bytes of CSPRNG
 * output, not a guessable human secret, so there is nothing for a slow hash to
 * defend against, and the lookup has to be a single indexed equality match.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** How long a reset link stays usable. Mirrored in the email copy. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** A fresh token: the raw value for the email, the hash for the database. */
export function createResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Rejects anything that is not the exact shape `createResetToken` produces,
 * before it is used to build a query.
 */
export function isWellFormedResetToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

/**
 * Constant-time comparison of two hex digests, for the paths that compare a
 * candidate against a value already in hand rather than querying by it.
 */
export function resetTokenHashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
