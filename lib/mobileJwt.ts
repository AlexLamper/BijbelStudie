import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';

/**
 * Access tokens for the mobile apps.
 *
 * Signed with MOBILE_JWT_SECRET, deliberately NOT with NEXTAUTH_SECRET: a
 * leaked mobile secret must not let anyone forge a website session, and
 * rotating one must not sign every browser out.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export type MobileAccessClaims = {
  sub: string;
  email: string;
  isPro: boolean;
  jti: string;
  iat: number;
  exp: number;
};

let cachedSecret: Uint8Array | null = null;

function secret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.MOBILE_JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'MOBILE_JWT_SECRET is not set (or is shorter than 32 chars). Mobile auth is disabled.',
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

/** Test seam: clears the memoised key after the env var changes. */
export function resetMobileJwtSecretCache(): void {
  cachedSecret = null;
}

export async function signAccessToken(params: {
  userId: string;
  email: string;
  isPro: boolean;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await new SignJWT({
    email: params.email,
    isPro: params.isPro,
    typ: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(params.userId)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(secret());

  return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<MobileAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (payload.typ !== 'access' || typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      isPro: payload.isPro === true,
      jti: typeof payload.jti === 'string' ? payload.jti : '',
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    // Expired, wrong signature, malformed - all the same answer to the caller.
    return null;
  }
}
