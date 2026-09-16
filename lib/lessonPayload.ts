import type { CuratedStudy, Lesson } from './data/curated-studies';
import { getLessonContent } from './data/study-lessons';
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

export interface LessonCoreInput {
  study: CuratedStudy;
  lesson: Lesson;
  /** The translation the lesson opens in. */
  translation: string;
  /** Already resolved through `resolveCommentaryId`. */
  commentaryId: string;
}

/** The shape the v1 API has always returned (no translation list, no outline). */
export function buildLessonCore({ study, lesson, translation, commentaryId }: LessonCoreInput) {
  const content = getLessonContent(study.id, lesson.day);
  return {
    study: { id: study.id, title: study.title, lessonsTotal: study.lessons.length },
    lesson: {
      day: lesson.day,
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes ?? 12,
    },
    steps: resolveSteps(lesson, content),
    passage: resolvePassage(lesson, content),
    translation,
    commentaryId,
    content: {
      intro: content?.intro ?? null,
      readingCue: content?.word?.readingCue ?? null,
      depth: content?.depth ?? null,
      reflection: {
        // Falls back to the lesson's legacy `focus` field, so a lesson with
        // no authored reflection still asks something real.
        question: resolveReflectionQuestion(lesson, content),
        prompts: content?.reflection?.prompts ?? [],
        placeholder: content?.reflection?.placeholder ?? null,
      },
      quiz: {
        enabled: content?.quiz?.enabled !== false,
        questionCount: content?.quiz?.questionCount ?? 5,
      },
    },
    nextLessonDay: nextLessonDay(study, lesson.day),
  };
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
  quiz?: { score?: number | null; total?: number | null; attempts?: number };
  completedAt?: Date | null;
}

export const EMPTY_LESSON_STATE: LessonStatePayload = {
  stepsCompleted: [],
  currentStep: 'intro',
  viewTranslation: null,
  depthPanel: null,
  reflection: { text: '', updatedAt: null, noteId: null },
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
    quiz: {
      score: state?.quiz?.score ?? null,
      total: state?.quiz?.total ?? null,
      attempts: state?.quiz?.attempts ?? 0,
    },
    completedAt: state?.completedAt ? state.completedAt.toISOString() : null,
  };
}
