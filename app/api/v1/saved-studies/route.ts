import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { findStudy } from '../../../../lib/studyEnrollmentService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** The ids of the studies this account has saved. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();
    const row = await User.findById(auth.id)
      .select('savedStudies')
      .lean<{ savedStudies?: string[] | null } | null>();
    if (!row) return errorV1('NOT_FOUND', 404);
    return jsonV1({ savedStudies: Array.isArray(row.savedStudies) ? row.savedStudies : [] });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Saves or un-saves one study: `{ studyId, saved: boolean }`.
 *
 * A targeted `$addToSet` / `$pull` on the one array, never a `save()` of a
 * hydrated User - see the data-safety notes in CLAUDE.md.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

    const studyId = typeof body.studyId === 'string' ? body.studyId.trim() : '';
    if (!studyId) return errorV1('MISSING_FIELDS', 400, 'studyId is verplicht');
    if (typeof body.saved !== 'boolean') return errorV1('INVALID_FIELDS', 400, 'saved is verplicht');
    if (!findStudy(studyId)) return errorV1('NOT_FOUND', 404, 'Onbekende studie');

    await connectMongoDB();
    const update = body.saved
      ? { $addToSet: { savedStudies: studyId } }
      : { $pull: { savedStudies: studyId } };
    const result = await User.updateOne({ _id: auth.id }, update);
    if (result.matchedCount === 0) return errorV1('NOT_FOUND', 404);

    return jsonV1({ studyId, saved: body.saved });
  } catch (error) {
    return handleV1Error(error);
  }
}
