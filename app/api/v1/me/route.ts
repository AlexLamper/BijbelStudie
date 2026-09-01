import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { requireUser, toAuthUser } from '../../../../lib/apiAuth';
import { serialiseUser } from '../../../../lib/mobileAuthFlow';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/me
 *
 * The server is authoritative for entitlement. RevenueCat's local
 * `CustomerInfo` is only the fast signal; when the two disagree the app calls
 * /api/v1/sync-premium and re-reads this.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return jsonV1({
      ...serialiseUser(user),
      preferences: await loadPreferences(user.id),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** PATCH /api/v1/me - name, bio, image and reading preferences. */
export async function PATCH(req: NextRequest) {
  try {
    const caller = await requireUser(req);
    const body = (await req.json()) as Record<string, unknown>;

    const set: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) set.name = body.name.trim().slice(0, 120);
    if (typeof body.bio === 'string') set.bio = body.bio.slice(0, 500);

    const prefs = body.preferences as Record<string, unknown> | undefined;
    if (prefs && typeof prefs === 'object') {
      for (const key of ALLOWED_PREFERENCE_KEYS) {
        if (key in prefs) set[`preferences.${key}`] = prefs[key];
      }
      set['preferences.updatedAt'] = new Date();
    }

    if (Object.keys(set).length === 0) {
      return errorV1('NOTHING_TO_UPDATE', 400, 'Geen bekende velden meegestuurd.');
    }

    await connectMongoDB();
    const doc = await User.findByIdAndUpdate(caller.id, { $set: set }, { new: true });
    if (!doc) return errorV1('NOT_FOUND', 404);

    return jsonV1({
      ...serialiseUser(toAuthUser(doc)),
      preferences: pickPreferences(doc.preferences),
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Explicit list, not a spread of whatever the client sent: `preferences` sits
 * on the same document as `subscribed` and `isAdmin`, and a blind $set of a
 * caller-supplied object is how a user grants themselves Pro.
 */
const ALLOWED_PREFERENCE_KEYS = [
  'translation',
  'commentary',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'highContrast',
  'showVerseNumbers',
  'ttsVoice',
  'onboardingCompleted',
  'tourCompleted',
] as const;

type Preferences = Record<string, unknown> | null | undefined;

function pickPreferences(prefs: Preferences) {
  const source = (prefs ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_PREFERENCE_KEYS) out[key] = source[key] ?? null;
  return out;
}

async function loadPreferences(userId: string) {
  await connectMongoDB();
  const doc = await User.findById(userId).select('preferences lastReadChapter');
  return pickPreferences(doc?.preferences);
}
