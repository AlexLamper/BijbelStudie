import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import {
  createEnrollment,
  isDepth,
  isRhythm,
  listEnrollments,
  sanitiseReminderDays,
  sanitiseReminderMinutes,
  sanitiseTimezone,
  serialiseEnrollment,
  type EnrollmentSettings,
} from '../../../../lib/studyEnrollmentService';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/** Every study this user has started, most recently touched first. */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const enrollments = await listEnrollments(auth.id);
    return jsonV1({ enrollments: enrollments.map(serialiseEnrollment) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Starts a study.
 *
 * `{ studyId, rhythm?, reminderDays?, translation?, depth?, commentary?,
 *    remindersEnabled?, reminderMinutes?, reminderTimezone? }`
 *
 * The client should send `Intl.DateTimeFormat().resolvedOptions().timeZone` as
 * `reminderTimezone`. Without it everyone inherits the Europe/Amsterdam default
 * on models/User.js, which is silently wrong for anyone who never opened
 * settings - and a reminder in the wrong timezone arrives in the middle of the
 * night rather than not at all.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) ?? {};

    const studyId = typeof body.studyId === 'string' ? body.studyId.trim() : '';
    if (!studyId) return errorV1('MISSING_FIELDS', 400, 'studyId is verplicht');

    const settings: EnrollmentSettings = {};
    if (body.rhythm !== undefined) {
      if (!isRhythm(body.rhythm)) return errorV1('INVALID_FIELDS', 400, 'Onbekend studieritme');
      settings.rhythm = body.rhythm;
    }
    if (body.depth !== undefined) {
      if (!isDepth(body.depth)) return errorV1('INVALID_FIELDS', 400, 'Onbekende uitlegdiepte');
      settings.depth = body.depth;
    }
    if (body.reminderDays !== undefined) settings.reminderDays = sanitiseReminderDays(body.reminderDays);
    if (body.translation !== undefined) {
      settings.translation = typeof body.translation === 'string' ? body.translation : null;
    }
    if (body.commentary !== undefined) {
      settings.commentary = typeof body.commentary === 'string' ? body.commentary : null;
    }
    if (body.remindersEnabled !== undefined) settings.remindersEnabled = !!body.remindersEnabled;
    if (body.reminderMinutes !== undefined) {
      settings.reminderMinutes = sanitiseReminderMinutes(body.reminderMinutes);
    }
    if (body.reminderTimezone !== undefined) {
      settings.reminderTimezone = sanitiseTimezone(body.reminderTimezone);
    }

    const result = await createEnrollment(auth.id, studyId, settings);
    if (!result) return errorV1('NOT_FOUND', 404, 'Onbekende studie');

    return jsonV1(
      { enrollment: serialiseEnrollment(result.enrollment), created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
