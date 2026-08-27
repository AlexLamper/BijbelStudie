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
    if (!email || !password) {
      return errorV1('MISSING_FIELDS', 400, 'email en password zijn verplicht.');
    }

    await connectMongoDB();
    const user = await findUserByEmail(email);

    // One message for "no such user" and "wrong password": distinguishing them
    // turns this endpoint into an account-existence oracle.
    const invalid = errorV1('INVALID_CREDENTIALS', 401, 'E-mailadres of wachtwoord klopt niet.');
    if (!user || !user.password) return invalid;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return invalid;

    return jsonV1(await issueSession(user, { platform, deviceName }));
  } catch (error) {
    return handleV1Error(error);
  }
}
