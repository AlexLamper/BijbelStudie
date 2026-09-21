import type { CuratedStudy, Lesson } from './data/curated-studies';
import { getLessonContent } from './data/study-lessons';
import { buildLessonContext } from './lessonContext';
import { chapterStudyTemplate } from './chapterStudyTemplate';
import { findBook } from './chapterStudyRef';
import type { StepKey } from './studyFlow';
import {
  nextLessonDay,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
} from './studyFlow';
import type {
  LessonPayload,
  LessonStatePayload,
} from '../components/study/flow/StudyFlowShell';

/**
 * Everything one lesson needs to render, built in one place.
 *
 * SERVER-ONLY (it reads lib/data/study-lessons). Used by the lesson page and
 * its guest branch, the single-chapter study page, GET /api/v1/studies/:id/
 * lessons/:day and GET /api/v1/chapter-study/:book/:chapter. Those used to hold
 * three copies of the same object literal, and a field added to one of them
 * was a field the other clients silently lacked. tests/lessonPayload.test.ts
 * pins the output to what the copies produced.
 */

/**
 * The week's practice when the lesson did not author one.
 *
 * lib/data/study-lessons only lays the genre template under GENERATED book
 * studies, because that is where it was born - it cannot resolve a genre for a
 * curated study, which is keyed by a name like `opstanding` rather than by a
 * book. Here the lesson itself is in hand, so its book answers the question and
 * every lesson in the catalogue ends with something to do, authored or not.
 */
function fallbackPractices(bookName: string): string[] {
  const book = findBook(bookName);
  return book ? [...chapterStudyTemplate(book.genre).practices] : [];
}

export interface LessonCoreInput {
  study: CuratedStudy;
  lesson: Lesson;
  /** The translation the lesson opens in. */
  translation: string;
  /** Already resolved through `resolveCommentaryId`. */
  commentaryId: string;
}

/**
 * The shape the v1 API has always returned (no translation list, no outline).
 *
 * ADDITIVE ONLY, and deliberately so. App builds already installed parse this
 * object field by field and drop step ids they do not recognise
 * (`StudyStep.tryFromId`), so `content.context` and the new fields under
 * `content.reflection` are invisible to them while `steps` simply arrives one
 * entry shorter. That is why the Toepassing step kept the wire key
 * `reflection`: renaming it would have deleted the step on every phone that
 * has not updated.
 */
export function buildLessonCore({ study, lesson, translation, commentaryId }: LessonCoreInput) {
  const content = getLessonContent(study.id, lesson.day);
  const passage = resolvePassage(lesson, content);
  const context = buildLessonContext(passage, content);
  return {
    study: { id: study.id, title: study.title, lessonsTotal: study.lessons.length },
    lesson: {
      day: lesson.day,
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes ?? 15,
    },
    steps: resolveSteps(lesson, content, { hasContext: !!context }),
    passage,
    translation,
    commentaryId,
    content: {
      intro: content?.intro ?? null,
      context,
      readingCue: content?.word?.readingCue ?? null,
      depth: content?.depth ?? null,
      reflection: {
        // Falls back to the lesson's legacy `focus` field, so a lesson with
        // no authored reflection still asks something real.
        question: resolveReflectionQuestion(lesson, content),
        prompts: content?.reflection?.prompts ?? [],
        placeholder: content?.reflection?.placeholder ?? null,
        // The week's practice. Empty only for a study that authored an empty
        // list on purpose - generated lessons get the genre template through
        // `mergeTemplateUnder`.
        practices: content?.reflection?.practices?.length
          ? content.reflection.practices
          : fallbackPractices(passage.book),
        memoryVerse: content?.reflection?.memoryVerse ?? null,
      },
      quiz: {
        enabled: content?.quiz?.enabled !== false,
        questionCount: content?.quiz?.questionCount ?? 5,
      },
    },
    nextLessonDay: nextLessonDay(study, lesson.day),
  };
}

/**
 * The steps of one lesson, resolved exactly the way `buildLessonCore` resolves
 * them - `hasContext` and all.
 *
 * For callers that need the step list BEFORE they can build a payload (the
 * single-chapter page picks its initial step for two different branches).
 * Everyone else should read `payload.steps`: two independent answers to "does
 * this lesson have a context step" is how a reader lands on a step the flow
 * will not render.
 */
export function resolveLessonSteps(studyId: string, lesson: Lesson): StepKey[] {
  const content = getLessonContent(studyId, lesson.day);
  const passage = resolvePassage(lesson, content);
  return resolveSteps(lesson, content, { hasContext: !!buildLessonContext(passage, content) });
}

export interface LessonPayloadInput extends LessonCoreInput {
  translations: { id: string; name: string; language?: string }[];
  /** Lesson days with a StudyProgress row; empty for a guest. */
  completedDays: ReadonlySet<number>;
}

/** The web flow's payload: the core plus the translation list and the outline. */
export function buildLessonPayload(input: LessonPayloadInput): LessonPayload {
  const { study, translations, completedDays } = input;
  return {
    ...buildLessonCore(input),
    translations: translations.map((version) => ({
      id: version.id,
      name: version.name,
      language: version.language,
    })),
    outline: study.lessons.map((entry) => ({
      day: entry.day,
      title: entry.title,
      reference: `${entry.book} ${entry.chapter}${entry.verseRange ? `:${entry.verseRange}` : ''}`,
      completed: completedDays.has(entry.day),
    })),
  };
}

/** A StudyLessonState document as the pages read it with `.lean()`. */
export interface StoredLessonState {
  stepsCompleted?: string[];
  currentStep?: string;
  viewTranslation?: string | null;
  depthPanel?: string | null;
  reflection?: { text?: string; updatedAt?: Date | null; noteId?: unknown };
  application?: { practicesDone?: string[] };
  quiz?: { score?: number | null; total?: number | null; attempts?: number };
  completedAt?: Date | null;
}

export const EMPTY_LESSON_STATE: LessonStatePayload = {
  stepsCompleted: [],
  currentStep: 'intro',
  viewTranslation: null,
  depthPanel: null,
  reflection: { text: '', updatedAt: null, noteId: null },
  application: { practicesDone: [] },
  quiz: { score: null, total: null, attempts: 0 },
  completedAt: null,
};

/** The stored state for the client, with `fallbackStep` when none is stored. */
export function buildLessonState(
  state: StoredLessonState | null | undefined,
  fallbackStep: string,
): LessonStatePayload {
  return {
    stepsCompleted: state?.stepsCompleted ?? [],
    currentStep: state?.currentStep ?? fallbackStep,
    viewTranslation: state?.viewTranslation ?? null,
    depthPanel: state?.depthPanel ?? null,
    reflection: {
      text: state?.reflection?.text ?? '',
      updatedAt: state?.reflection?.updatedAt ? state.reflection.updatedAt.toISOString() : null,
      noteId: state?.reflection?.noteId ? String(state.reflection.noteId) : null,
    },
    application: { practicesDone: state?.application?.practicesDone ?? [] },
    quiz: {
      score: state?.quiz?.score ?? null,
      total: state?.quiz?.total ?? null,
      attempts: state?.quiz?.attempts ?? 0,
    },
    completedAt: state?.completedAt ? state.completedAt.toISOString() : null,
  };
}
