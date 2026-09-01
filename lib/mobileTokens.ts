import { createHash, randomBytes, randomUUID } from 'crypto';
import RefreshToken from '../models/RefreshToken';

/**
 * Refresh-token issue / rotate / revoke, with replay detection.
 *
 * The whole point of a refresh token over a long-lived access token is that a
 * stolen one can be *detected*. That only works if rotation is mandatory and a
 * second presentation of an already-rotated token is treated as theft, not as
 * a retry. See `rotateRefreshToken` below.
 */

export const REFRESH_TOKEN_TTL_DAYS = 90;

export type Platform = 'ios' | 'android' | 'web' | 'unknown';

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function normalisePlatform(value: unknown): Platform {
  return value === 'ios' || value === 'android' || value === 'web' ? value : 'unknown';
}

function expiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function issueRefreshToken(params: {
  userId: string;
  family?: string;
  platform?: Platform;
  deviceName?: string;
}): Promise<{ refreshToken: string; family: string; tokenHash: string }> {
  // 256 bits of entropy, opaque. Never a JWT: an opaque token cannot be
  // "read" by the client and cannot outlive its database row.
  const refreshToken = randomBytes(32).toString('base64url');
  const tokenHash = hashRefreshToken(refreshToken);
  const family = params.family ?? randomUUID();

  await RefreshToken.create({
    userId: params.userId,
    tokenHash,
    family,
    platform: params.platform ?? 'unknown',
    deviceName: params.deviceName,
    expiresAt: expiryDate(),
  });

  return { refreshToken, family, tokenHash };
}

export type RotateFailure = 'unknown' | 'expired' | 'replayed';

// `reason?: undefined` on the success arm keeps the property readable without a
// cast: this repo compiles with `strict: false`, where discriminated-union
// narrowing on a boolean literal is not reliable enough to lean on.
export type RotateResult =
  | { ok: true; userId: string; refreshToken: string; family: string; reason?: undefined }
  | { ok: false; reason: RotateFailure };

/**
 * Exchanges a refresh token for a fresh one.
 *
 * If the presented token was already revoked, the entire family is revoked and
 * the caller must log in again: either the client replayed an old token (a
 * bug) or someone else is holding a copy (theft). Both deserve the same
 * response - invalidate everything descended from that login.
 */
export async function rotateRefreshToken(rawToken: string): Promise<RotateResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) return { ok: false, reason: 'unknown' };

  if (existing.revokedAt) {
    await revokeFamily(existing.family);
    return { ok: false, reason: 'replayed' };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const issued = await issueRefreshToken({
    userId: existing.userId.toString(),
    family: existing.family,
    platform: existing.platform,
    deviceName: existing.deviceName,
  });

  existing.revokedAt = new Date();
  existing.lastUsedAt = new Date();
  existing.replacedByHash = issued.tokenHash;
  await existing.save();

  return {
    ok: true,
    userId: existing.userId.toString(),
    refreshToken: issued.refreshToken,
    family: issued.family,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await RefreshToken.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeFamily(family: string): Promise<void> {
  await RefreshToken.updateMany({ family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
