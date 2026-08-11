import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit, clientIp } from '../../../../../lib/mobileRateLimit';
import { issueSession } from '../../../../../lib/mobileAuthFlow';
import { verifyGoogleIdToken } from '../../../../../lib/oauthVerify';

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

    let user = await User.findOne({ googleId: identity.sub });
    if (!user) {
      user = await User.findOne({ email: identity.email });
      if (user) {
        // Existing website account (created by the NextAuth signIn callback).
        // Linking by verified email is safe here because Google asserts it.
        user.googleId = identity.sub;
        if (!user.image && identity.picture) user.image = identity.picture;
        await user.save();
      } else {
        user = await User.create({
          name: identity.name || identity.email.split('@')[0],
          email: identity.email,
          image: identity.picture ?? '',
          googleId: identity.sub,
          bio: '',
        });
      }
    }

    return jsonV1(await issueSession(user, { platform, deviceName }));
  } catch (error) {
    return handleV1Error(error);
  }
}
