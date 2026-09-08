import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../../lib/mongodb';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit, clientIp } from '../../../../../lib/mobileRateLimit';
import { issueSession } from '../../../../../lib/mobileAuthFlow';
import { verifyGoogleIdToken } from '../../../../../lib/oauthVerify';
import { provisionOAuthUser } from '../../../../../lib/oauthUsers';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(`google:${clientIp(req)}`, 20, 15 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${limit.retryAfterSeconds}s opnieuw.`);
    }

    const { idToken, platform, deviceName } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return errorV1('MISSING_FIELDS', 400, 'idToken is verplicht.');
    }

    const identity = await verifyGoogleIdToken(idToken);
    if (!identity) {
      return errorV1('INVALID_TOKEN', 401, 'Google-token is ongeldig.');
    }
    if (!identity.email) {
      return errorV1('NO_EMAIL', 422, 'Google gaf geen e-mailadres terug.');
    }

    await connectMongoDB();

    // Find, link (case-insensitively, so a website account registered as
    // `Bob@x.com` is recognised as the same person signing in as `bob@x.com`)
    // or create - atomically, so a racing first login cannot 500. Linking by
    // verified email is safe because Google asserts the address.
    const user = await provisionOAuthUser({
      provider: 'google',
      providerId: identity.sub,
      email: identity.email,
      name: identity.name || identity.email.split('@')[0],
      image: identity.picture,
    });

    return jsonV1(await issueSession(user, { platform, deviceName }));
  } catch (error) {
    return handleV1Error(error);
  }
}
