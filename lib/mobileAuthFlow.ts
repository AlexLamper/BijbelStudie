import { signAccessToken } from './mobileJwt';
import { issueRefreshToken, normalisePlatform, type Platform } from './mobileTokens';
import { toAuthUser, type AuthUser } from './apiAuth';

/**
 * Shared "you are logged in now" step for every /api/v1/auth/* route, so the
 * six of them cannot drift in what they return.
 */

export type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ReturnType<typeof serialiseUser>;
};

export function serialiseUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    isPro: user.isPro,
    proSource: user.proSource,
    proExpiresAt: user.proExpiresAt ? user.proExpiresAt.toISOString() : null,
    isAdmin: user.isAdmin,
  };
}

type UserDocLike = Parameters<typeof toAuthUser>[0];

export async function issueSession(
  doc: UserDocLike,
  options?: { platform?: unknown; deviceName?: unknown },
): Promise<SessionPayload> {
  const user = toAuthUser(doc);
  const { accessToken, expiresIn } = await signAccessToken({
    userId: user.id,
    email: user.email,
    isPro: user.isPro,
  });
  const { refreshToken } = await issueRefreshToken({
    userId: user.id,
    platform: normalisePlatform(options?.platform) as Platform,
    deviceName: typeof options?.deviceName === 'string' ? options.deviceName.slice(0, 120) : undefined,
  });

  return { accessToken, refreshToken, expiresIn, user: serialiseUser(user) };
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
