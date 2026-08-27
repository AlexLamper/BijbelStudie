import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import StudyLessonState from '../../../../models/StudyLessonState.js';
import { getLessonContent } from '../../../../lib/data/study-lessons';
import {
  findLesson,
  isStepKey,
  nextLessonDay,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
} from '../../../../lib/studyFlow';
import {
  findStudy,
  getEnrollment,
  isCursorStep,
  moveCursor,
  syncEnrollmentAfterLesson,
} from '../../../../lib/studyEnrollmentService';
import { promoteReflectionToNote, recordLessonCompletion } from '../../../../lib/studyCompletion';

export const dynamic = 'force-dynamic';

const MAX_REFLECTION_CHARS = 8000;

export async function OPTIONS() {
  return corsPreflight();
}

interface LessonStateDoc {
  _id: unknown;
  stepsCompleted: string[];
  currentStep: string;
  reflection: { text: string; updatedAt: Date | null; noteId: unknown };
  quiz: {
    quizIds: string[];
    questionIds: string[];
    score: number | null;
    total: number | null;
    attempts: number;
    lastAttemptAt: Date | null;
  };
  startedAt: Date;
  completedAt: Date | null;
}

function serialise(studyId: string, lessonDay: number, doc: LessonStateDoc | null) {
  return {
    studyId,
    lessonDay,
    stepsCompleted: doc?.stepsCompleted ?? [],
    currentStep: doc?.currentStep ?? 'intro',
    reflection: {
      text: doc?.reflection?.text ?? '',
      updatedAt: doc?.reflection?.updatedAt ?? null,
      noteId: doc?.reflection?.noteId ? String(doc.reflection.noteId) : null,
    },
    quiz: {
      score: doc?.quiz?.score ?? null,
      total: doc?.quiz?.total ?? null,
      attempts: doc?.quiz?.attempts ?? 0,
      lastAttemptAt: doc?.quiz?.lastAttemptAt ?? null,
    },
    completedAt: doc?.completedAt ?? null,
  };
}

/** `?studyId=opstanding&day=2` */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    const url = new URL(req.url);
    const studyId = url.searchParams.get('studyId') ?? '';
    const lessonDay = Number(url.searchParams.get('day'));

    if (!studyId || !Number.isInteger(lessonDay)) {
      return errorV1('MISSING_FIELDS', 400, 'studyId en day zijn verplicht');
    }

    await connectMongoDB();
    const doc = await StudyLessonState.findOne({
      userId: auth.id,
      studyId,
      lessonDay,
    }).lean<LessonStateDoc>();

    return jsonV1({ state: serialise(studyId, lessonDay, doc) });
  } catch (error) {
    return handleV1Error(error);
  }
}

/**
 * `{ studyId, lessonDay, currentStep?, completeStep?, reflectionText?, complete? }`
 *
 * One endpoint for every write the flow makes, because they all happen on the
 * same document and separating them would mean two round trips per step
 * transition. `complete: true` is the only branch that touches the XP ledger,
 * and it does so through lib/studyCompletion like every other caller.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) ?? {};

    const studyId = typeof body.studyId === 'string' ? body.studyId.trim() : '';
    const lessonDay = Number(body.lessonDay);

    if (!studyId || !Number.isInteger(lessonDay)) {
      return errorV1('MISSING_FIELDS', 400, 'studyId en lessonDay zijn verplicht');
    }

    const study = findStudy(studyId);
    if (!study) return errorV1('NOT_FOUND', 404, 'Onbekende studie');

    const lesson = findLesson(study, lessonDay);
    if (!lesson) return errorV1('NOT_FOUND', 404, 'Onbekende les');

    await connectMongoDB();

    const set: Record<string, unknown> = {};
    const addToSet: Record<string, unknown> = {};

    if (body.currentStep !== undefined) {
      if (!isCursorStep(body.currentStep)) {
        return errorV1('INVALID_FIELDS', 400, 'Onbekende stap');
      }
      set.currentStep = body.currentStep;
    }

    if (body.completeStep !== undefined) {
      if (!isStepKey(body.completeStep)) {
        return errorV1('INVALID_FIELDS', 400, 'Onbekende stap');
      }
      addToSet.stepsCompleted = body.completeStep;
    }

    if (body.reflectionText !== undefined) {
      if (typeof body.reflectionText !== 'string') {
        return errorV1('INVALID_FIELDS', 400, 'reflectionText moet tekst zijn');
      }
      set['reflection.text'] = body.reflectionText.slice(0, MAX_REFLECTION_CHARS);
      set['reflection.updatedAt'] = new Date();
    }

    const update: Record<string, unknown> = {
      $setOnInsert: { userId: auth.id, studyId, lessonDay, startedAt: new Date() },
    };
    if (Object.keys(set).length > 0) update.$set = set;
    if (Object.keys(addToSet).length > 0) update.$addToSet = addToSet;

    await StudyLessonState.updateOne({ userId: auth.id, studyId, lessonDay }, update, {
      upsert: true,
    });

    let completion: Awaited<ReturnType<typeof recordLessonCompletion>> | null = null;
    let noteId: string | null = null;

    if (body.complete === true) {
      const content = getLessonContent(studyId, lessonDay);
      const passage = resolvePassage(lesson, content);
      const enrollment = await getEnrollment(auth.id, studyId);

      completion = await recordLessonCompletion({
        userId: auth.id,
        isPro: auth.isPro,
        source: 'curated',
        studyId,
        lessonDay,
        book: passage.book,
        chapter: passage.chapter,
        verseStart: passage.verseStart,
        verseEnd: passage.verseEnd,
      });

      const current = await StudyLessonState.findOne({
        userId: auth.id,
        studyId,
        lessonDay,
      }).lean<LessonStateDoc>();

      // Promote the draft only now. Doing it on every autosave would put every
      // abandoned half-sentence in /notities.
      if (current?.reflection?.text?.trim()) {
        noteId = await promoteReflectionToNote({
          userId: auth.id,
          studyId,
          studyTitle: study.title,
          lessonTitle: lesson.title,
          question: resolveReflectionQuestion(lesson, content),
          reflection: current.reflection.text,
          translation: enrollment?.translation ?? study.startVersion,
          book: passage.book,
          chapter: passage.chapter,
          verseStart: passage.verseStart,
          verseEnd: passage.verseEnd,
          tags: content?.reflection?.noteTags,
          existingNoteId: current.reflection.noteId ? String(current.reflection.noteId) : null,
        });
      }

      const steps = resolveSteps(lesson, content);
      await StudyLessonState.updateOne(
        { userId: auth.id, studyId, lessonDay },
        {
          $set: {
            completedAt: current?.completedAt ?? new Date(),
            currentStep: 'done',
            ...(noteId ? { 'reflection.noteId': noteId } : {}),
          },
          $addToSet: { stepsCompleted: { $each: steps } },
        },
      );

      await syncEnrollmentAfterLesson(auth.id, studyId, nextLessonDay(study, lessonDay));
    } else if (set.currentStep !== undefined) {
      await moveCursor(auth.id, studyId, lessonDay, set.currentStep as never);
    }

    const doc = await StudyLessonState.findOne({
      userId: auth.id,
      studyId,
      lessonDay,
    }).lean<LessonStateDoc>();

    return jsonV1({
      state: serialise(studyId, lessonDay, doc),
      completion: completion
        ? {
            recorded: completion.recorded,
            reason: completion.reason ?? null,
            studyCompleted: completion.studyCompleted,
            xp: completion.xp,
            noteId,
            nextLessonDay: nextLessonDay(study, lessonDay),
          }
        : null,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
