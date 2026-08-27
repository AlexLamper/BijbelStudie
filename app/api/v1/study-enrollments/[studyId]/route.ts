import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import {
  abandonEnrollment,
  getEnrollment,
  isDepth,
  isRhythm,
  sanitiseReminderDays,
  sanitiseReminderMinutes,
  sanitiseTimezone,
  serialiseEnrollment,
  updateEnrollmentSettings,
  type EnrollmentSettings,
} from '../../../../../lib/studyEnrollmentService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ studyId: string }>;
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireUser(req);
    const { studyId } = await params;
    const enrollment = await getEnrollment(auth.id, studyId);
    if (!enrollment) return errorV1('NOT_FOUND', 404, 'Niet ingeschreven voor deze studie');
    return jsonV1({ enrollment: serialiseEnrollment(enrollment) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Changes the study settings. Recomputes `nextReminderAt` from the merged
 * result, in lib/studyEnrollmentService, so the stored instant can never
 * disagree with the rhythm that produced it.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireUser(req);
    const { studyId } = await params;
    const body = (await req.json().catch(() => ({}))) ?? {};

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

    if (Object.keys(settings).length === 0) {
      return errorV1('NOTHING_TO_UPDATE', 400, 'Geen bekende velden meegestuurd');
    }

    const enrollment = await updateEnrollmentSettings(auth.id, studyId, settings);
    if (!enrollment) return errorV1('NOT_FOUND', 404, 'Niet ingeschreven voor deze studie');

    return jsonV1({ enrollment: serialiseEnrollment(enrollment) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * Stops a study.
 *
 * Marks it abandoned and silences reminders rather than deleting anything - the
 * completion ledger and any written reflections survive. Quitting a study is not
 * a request to erase what you already did.
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireUser(req);
    const { studyId } = await params;
    const found = await abandonEnrollment(auth.id, studyId);
    if (!found) return errorV1('NOT_FOUND', 404, 'Niet ingeschreven voor deze studie');
    return jsonV1({ ok: true });
  } catch (error) {
    return handleV1Error(error);
  }
}
