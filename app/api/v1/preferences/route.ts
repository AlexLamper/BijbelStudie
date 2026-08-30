import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Reading and onboarding preferences, shared with the website so a setting
 * changed on the phone is already applied in the browser.
 *
 * Only the keys the website itself writes (`/api/user/preferences`) are
 * accepted; anything else is dropped rather than rejected, so an older binary
 * sending an unknown field still saves the rest.
 */
const ALLOWED_STRING_KEYS = [
  'language',
  'translation',
  'commentary',
  'intent',
  // Guided study vs. reading on your own. Listed so the phone and the browser
  // agree about it like they do about every other onboarding answer; unlike the
  // website's own route this does not check the enum, so the UI narrows what it
  // reads (normaliseStudyStyle) and an unknown value simply means "guided".
  'studyStyle',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'ttsVoice',
  // IANA zone the reminder time is expressed in, so a user who travels does
  // not get reminded at 3am.
  'reminderTimezone',
] as const;

const ALLOWED_BOOLEAN_KEYS = [
  'onboardingCompleted',
  'tourCompleted',
  'highContrast',
  'showVerseNumbers',
  // The daily reading reminder. The notification still fires locally on the
  // device; keeping the time server-side is what lets the website show it and
  // a reinstall restore it.
  'reminderEnabled',
] as const;

const ALLOWED_NUMBER_KEYS = [
  // Minutes past local midnight, 0–1439.
  'reminderMinutes',
] as const;

const NUMBER_BOUNDS: Record<(typeof ALLOWED_NUMBER_KEYS)[number], { min: number; max: number }> = {
  reminderMinutes: { min: 0, max: 1439 },
};

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const user = await User.findById(auth.id).select('preferences');

    return jsonV1({
      preferences: user?.preferences ?? null,
      onboardingCompleted: Boolean(user?.preferences?.onboardingCompleted),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};

    const updateData: Record<string, string | boolean | number | Date> = {
      'preferences.updatedAt': new Date(),
    };
    for (const key of ALLOWED_STRING_KEYS) {
      if (typeof body[key] === 'string' && body[key].length > 0) {
        updateData[`preferences.${key}`] = body[key];
      }
    }
    for (const key of ALLOWED_BOOLEAN_KEYS) {
      if (typeof body[key] === 'boolean') {
        updateData[`preferences.${key}`] = body[key];
      }
    }
    for (const key of ALLOWED_NUMBER_KEYS) {
      const value = Number(body[key]);
      const { min, max } = NUMBER_BOUNDS[key];
      if (Number.isInteger(value) && value >= min && value <= max) {
        updateData[`preferences.${key}`] = value;
      }
    }

    await connectMongoDB();
    const user = await User.findByIdAndUpdate(auth.id, { $set: updateData }, { new: true });

    return jsonV1({ preferences: user?.preferences ?? null });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** POST is accepted as an alias so the app can reuse one request builder. */
export async function POST(req: Request) {
  return PATCH(req);
}
