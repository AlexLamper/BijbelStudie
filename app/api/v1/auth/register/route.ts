import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit, clientIp } from '../../../../../lib/mobileRateLimit';
import { isValidEmail, issueSession } from '../../../../../lib/mobileAuthFlow';
import { findUserByEmail, normaliseEmail } from '../../../../../lib/userLookup';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(`register:${clientIp(req)}`, 10, 15 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${limit.retryAfterSeconds}s opnieuw.`);
    }

    const { name, email, password, platform, deviceName } = await req.json();

    if (!name || !email || !password) {
      return errorV1('MISSING_FIELDS', 400, 'name, email en password zijn verplicht.');
    }
    if (!isValidEmail(email)) {
      return errorV1('INVALID_EMAIL', 400, 'Voer een geldig e-mailadres in.');
    }
    if (typeof password !== 'string' || password.length < 8) {
      return errorV1('WEAK_PASSWORD', 400, 'Wachtwoord moet minstens 8 tekens zijn.');
    }

    await connectMongoDB();

    // Case-insensitive so `Bob@x.com` can't be registered twice as two
    // accounts that differ only in how the mail client capitalised them.
    const existing = await findUserByEmail(email);
    if (existing) {
      return errorV1('EMAIL_TAKEN', 409, 'Er bestaat al een account met dit e-mailadres.');
    }

    // Same cost factor as app/api/auth/register/route.ts, so a user created on
    // mobile can log in on the website and vice versa.
    const hashedPassword = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({ name, email: normaliseEmail(email), password: hashedPassword, bio: '' });
    } catch (createError) {
      // The findOne check above is not atomic with this insert: two requests
      // for the same email racing each other both pass it, and the loser hits
      // the unique index instead. That is EMAIL_TAKEN, not a server failure.
      if (
        createError instanceof Error &&
        (createError as { code?: number }).code === 11000
      ) {
        return errorV1('EMAIL_TAKEN', 409, 'Er bestaat al een account met dit e-mailadres.');
      }
      throw createError;
    }

    return jsonV1(await issueSession(user, { platform, deviceName }), { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}
