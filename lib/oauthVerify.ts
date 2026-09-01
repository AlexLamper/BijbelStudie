import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * ID-token verification for Sign in with Apple and Google Sign-In.
 *
 * Both providers publish a JWKS; `jose` fetches and caches it, so no extra SDK
 * is pulled in for what is two signature checks. The audience must be pinned -
 * an ID token minted for a *different* app is a perfectly valid JWT, and
 * accepting one would let any developer log in as any of our users.
 */

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function audiences(raw: string | undefined, fallback: string[]): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

export function appleAudiences(): string[] {
  // Native Sign in with Apple mints `aud` = the bundle ID; the web fallback
  // mints `aud` = the Services ID. Both are us, so both are accepted.
  return audiences(process.env.APPLE_CLIENT_IDS, [
    'com.bijbel-studie.app',
    'com.bijbel-studie.app.signin',
  ]);
}

export function googleAudiences(): string[] {
  return audiences(process.env.GOOGLE_MOBILE_CLIENT_IDS, [process.env.GOOGLE_ID ?? '']).filter(
    Boolean,
  );
}

export type AppleIdentity = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateRelay: boolean;
};

export async function verifyAppleIdentityToken(token: string): Promise<AppleIdentity | null> {
  const allowed = appleAudiences();
  if (allowed.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience: allowed,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

    const email = typeof payload.email === 'string' ? payload.email : null;
    return {
      sub: payload.sub,
      email,
      // Apple sends this as the string "true" as often as the boolean.
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      isPrivateRelay:
        payload.is_private_email === true ||
        payload.is_private_email === 'true' ||
        Boolean(email?.endsWith('@privaterelay.appleid.com')),
    };
  } catch {
    return null;
  }
}

export type GoogleIdentity = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export async function verifyGoogleIdToken(token: string): Promise<GoogleIdentity | null> {
  const allowed = googleAudiences();
  if (allowed.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: allowed,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    };
  } catch {
    return null;
  }
}
