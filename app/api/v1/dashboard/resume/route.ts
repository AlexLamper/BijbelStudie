import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { listEnrollments } from '../../../../../lib/studyEnrollmentService';
import { loadDashboardResume } from '../../../../../lib/dashboardResumeService';
import { completedStudyIds } from '../../../../../lib/studyRecommendations';
import { getState } from '../../../../../lib/bibleYear/service';
import {
  canonicaliseReadChapters,
  readChaptersFrom,
} from '../../../../../lib/readChaptersCanon';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The website dashboard's resume card, and the finished-study ids its
 * recommendation rows filter on.
 *
 * The web dashboard assembles its screen from separate calls
 * (hooks/useDashboardData.ts), so it cannot take the whole of GET
 * /api/v1/dashboard without paying for the notes, sessions, plan card and
 * daily verse twice. This REPLACES the page's former call to
 * /api/v1/study-enrollments: the same one indexed enrolment read, plus a
 * projected read of the three user fields the card needs and - only on a day a
 * study was touched - one indexed StudyProgress read. The `resume` object is
 * built by the same function GET /api/v1/dashboard uses, so web and app never
 * disagree about where the reader is.
 *
 * `{ resume: DashboardResume, completedStudyIds: string[],
 *    bibleYear: BibleYearToday | null, bibleYearState: BibleYearStateResponse | null }`
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    // `.lean()`: see lib/readChaptersCanon `readChaptersFrom` - a hydrated
    // document loses `readChapters` entirely when one key will not cast.
    const [user, enrollments, bibleYearState] = await Promise.all([
      User.findById(auth.id)
        .select('lastReadChapter readChapters preferences.reminderTimezone')
        .lean<{
          lastReadChapter?: {
            book?: string;
            chapter?: number;
            version?: string;
            updatedAt?: Date;
          } | null;
          readChapters?: unknown;
          preferences?: { reminderTimezone?: string | null } | null;
        } | null>(),
      listEnrollments(auth.id),
      // The Bijbel-in-een-jaar card under the resume card seeds itself from
      // this, so the dashboard makes no separate GET /api/v1/bible-year.
      // Null on failure: the card then fetches on its own.
      getState(auth.id).catch((error) => {
        console.error('[v1/dashboard/resume] bible-year failed:', error);
        return null;
      }),
    ]);

    const resume = await loadDashboardResume({
      userId: auth.id,
      lastRead: user?.lastReadChapter ?? null,
      readChapters: canonicaliseReadChapters(readChaptersFrom(user?.readChapters)),
      timeZone: user?.preferences?.reminderTimezone ?? null,
      enrollments,
    });

    return jsonV1({
      resume,
      completedStudyIds: [...completedStudyIds(enrollments)],
      bibleYear: bibleYearState?.today ?? null,
      bibleYearState,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
