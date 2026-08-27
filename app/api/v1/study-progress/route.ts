import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import StudyProgress from '../../../../models/StudyProgress.js';
import { curatedStudies } from '../../../../lib/data/curated-studies';
import { recordLessonCompletion } from '../../../../lib/studyCompletion';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Records that a passage was studied, not merely read.
 *
 * `/studie` kept lesson completion in localStorage, so the server could not
 * tell a finished eight-lesson study from a chapter someone scrolled past —
 * and clearing the tab wiped the user's progress. This is where that state now
 * lives.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const studyId = searchParams.get('studyId');

    const query: Record<string, unknown> = { userId: auth.id };
    if (studyId) query.studyId = studyId;

    const rows = await StudyProgress.find(query).sort({ completedAt: -1 }).limit(500).lean();

    // The set of curated studies the user has fully finished, which is what
    // /studies renders its "Voltooid" badge from.
    const byStudy = new Map<string, Set<number>>();
    for (const row of rows) {
      if (!row.studyId) continue;
      const days = byStudy.get(row.studyId) ?? new Set<number>();
      if (row.lessonDay != null) days.add(row.lessonDay);
      byStudy.set(row.studyId, days);
    }

    const completedStudies: string[] = [];
    for (const study of curatedStudies) {
      const done = byStudy.get(study.id);
      if (done && study.lessons.every((lesson) => done.has(lesson.day))) {
        completedStudies.push(study.id);
      }
    }

    return jsonV1({
      entries: rows.map((row) => ({
        id: row._id.toString(),
        source: row.source,
        studyId: row.studyId ?? null,
        lessonDay: row.lessonDay ?? null,
        planId: row.planId?.toString() ?? null,
        planDay: row.planDay ?? null,
        book: row.book,
        chapter: row.chapter,
        verseStart: row.verseStart ?? null,
        verseEnd: row.verseEnd ?? null,
        completedAt: row.completedAt,
      })),
      completedStudies,
      lessonsByStudy: Object.fromEntries(
        [...byStudy.entries()].map(([id, days]) => [id, [...days].sort((a, b) => a - b)]),
      ),
      total: rows.length,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * `{ source, book, chapter, studyId?, lessonDay?, verseStart?, verseEnd? }`
 *
 * Re-posting the same curated lesson is a no-op rather than an error: the
 * client retries on a flaky connection, and awarding XP twice for one lesson
 * would be worse than swallowing the duplicate.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) ?? {};

    const source = body.source === 'curated' || body.source === 'plan' ? body.source : 'los';
    const book = typeof body.book === 'string' ? body.book.trim() : '';
    const chapter = Number(body.chapter);

    if (!book || !Number.isInteger(chapter) || chapter < 1) {
      return errorV1('MISSING_FIELDS', 400, 'book en chapter zijn verplicht');
    }

    const studyId = typeof body.studyId === 'string' ? body.studyId : null;
    const lessonDay = Number.isInteger(Number(body.lessonDay)) ? Number(body.lessonDay) : null;

    const result = await recordLessonCompletion({
      userId: auth.id,
      isPro: auth.isPro,
      source,
      studyId,
      lessonDay,
      book,
      chapter,
      verseStart: Number.isInteger(Number(body.verseStart)) ? Number(body.verseStart) : null,
      verseEnd: Number.isInteger(Number(body.verseEnd)) ? Number(body.verseEnd) : null,
    });

    if (!result.recorded) {
      return jsonV1({ recorded: false, reason: result.reason, xp: null });
    }

    return jsonV1(
      { recorded: true, studyCompleted: result.studyCompleted, xp: result.xp },
      { status: 201 },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
