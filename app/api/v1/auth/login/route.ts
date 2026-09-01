import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import connectMongoDB from '../../../../../lib/mongodb';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit, clientIp } from '../../../../../lib/mobileRateLimit';
import { issueSession } from '../../../../../lib/mobileAuthFlow';
import { findUserByEmail } from '../../../../../lib/userLookup';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(`login:${clientIp(req)}`, 10, 15 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${limit.retryAfterSeconds}s opnieuw.`);
    }

    const { email, password, platform, deviceName } = await req.json();

    // Types, not just presence. Register has always checked this; login did
    // not, and the two functions downstream are both strict about it:
    // `normaliseEmail` calls `.trim()` and bcryptjs rejects a non-string
    // outright ("Illegal arguments"). Either throw left `handleV1Error` to
    // answer 500 INTERNAL_ERROR for what is a plain bad request.
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return errorV1('MISSING_FIELDS', 400, 'email en password zijn verplicht.');
    }

    await connectMongoDB();
    const user = await findUserByEmail(email);

    // One message for "no such user" and "wrong password": distinguishing them
    // turns this endpoint into an account-existence oracle.
    const invalid = errorV1('INVALID_CREDENTIALS', 401, 'E-mailadres of wachtwoord klopt niet.');
    if (!user) return invalid;

    if (!user.password) {
      // The account exists but was created through Google or Apple, so there
      // is no password to compare against. Answering INVALID_CREDENTIALS here
      // is technically true and practically useless: the user knows the
      // address is right, retypes the password they use elsewhere, and is
      // locked out forever with no hint that this form is the wrong door.
      //
      // This does confirm the address has an account - the oracle the generic
      // message above avoids. It is the same disclosure Google, GitHub and
      // Slack all make on this exact screen, and it only fires for accounts
      // that already federate their identity to a provider. If that trade is
      // ever unwanted, delete this block and the generic 401 takes over.
      const provider = user.googleId ? 'Google' : user.appleId ? 'Apple' : null;
      if (provider) {
        return errorV1(
          'OAUTH_ACCOUNT',
          409,
          `Dit account gebruikt ${provider} om in te loggen. Kies "Inloggen met ${provider}".`,
        );
      }
      // No password and no provider: nothing can sign this account in. Treat
      // it as a password reset case rather than a mystery.
      return errorV1(
        'NO_PASSWORD_SET',
        409,
        'Dit account heeft nog geen wachtwoord. Stel er een in via "Wachtwoord vergeten".',
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return invalid;

    return jsonV1(await issueSession(user, { platform, deviceName }));
  } catch (error) {
    return handleV1Error(error);
  }
}
