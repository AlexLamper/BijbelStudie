import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit, clientIp } from '../../../../../lib/mobileRateLimit';
import { issueSession } from '../../../../../lib/mobileAuthFlow';
import { verifyAppleIdentityToken } from '../../../../../lib/oauthVerify';
import { provisionOAuthUser } from '../../../../../lib/oauthUsers';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Sign in with Apple (guideline 4.8).
 *
 * Two Apple quirks drive the shape of this handler:
 *
 *  1. `email`, `givenName` and `familyName` are sent ONLY on the very first
 *     authorisation for this Apple ID. Every later sign-in carries the `sub`
 *     and nothing else. So the first request must persist them or they are
 *     gone for good - the user has to revoke the app in iOS Settings to get
 *     another chance.
 *  2. If the user chose "Hide My Email", the address is an
 *     @privaterelay.appleid.com alias. It is a real, deliverable address and
 *     is stored as-is; it must not be treated as invalid.
 */
export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(`apple:${clientIp(req)}`, 20, 15 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${limit.retryAfterSeconds}s opnieuw.`);
    }

    const { identityToken, givenName, familyName, email, platform, deviceName } = await req.json();
    if (!identityToken || typeof identityToken !== 'string') {
      return errorV1('MISSING_FIELDS', 400, 'identityToken is verplicht.');
    }

    const identity = await verifyAppleIdentityToken(identityToken);
    if (!identity) {
      return errorV1('INVALID_TOKEN', 401, 'Apple-token is ongeldig.');
    }

    // Apple's own claim wins; the client-supplied value is only a first-run
    // fallback and is never trusted over the signed token.
    const resolvedEmail = identity.email ?? (typeof email === 'string' ? email : null);

    await connectMongoDB();

    // A returning private-relay user often sends no email at all, so the
    // `appleId` lookup has to come before the NO_EMAIL check.
    let user = await User.findOne({ appleId: identity.sub });

    if (!user) {
      if (!resolvedEmail) {
        return errorV1(
          'NO_EMAIL',
          422,
          'Geen e-mailadres beschikbaar. Sta e-mail toe bij het inloggen met Apple.',
        );
      }
      const displayName =
        [givenName, familyName].filter((v) => typeof v === 'string' && v.trim()).join(' ').trim() ||
        resolvedEmail.split('@')[0];

      // Links case-insensitively to an existing account, or creates one
      // atomically. See lib/oauthUsers.ts for why neither is a `save()`.
      user = await provisionOAuthUser({
        provider: 'apple',
        providerId: identity.sub,
        email: resolvedEmail,
        name: displayName,
      });
    }

    return jsonV1(await issueSession(user, { platform, deviceName }));
  } catch (error) {
    return handleV1Error(error);
  }
}
