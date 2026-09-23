import type { CuratedStudy, Lesson } from './data/curated-studies';
import { getLessonContent } from './data/study-lessons';
import { buildLessonContext, placementOf } from './lessonContext';
import { chapterStudyTemplate } from './chapterStudyTemplate';
import { findBook } from './chapterStudyRef';
import type { LessonContent } from './data/study-lessons/types';
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

/**
 * Whether this lesson's "Bijbelse context" step has something the reader has
 * not just seen.
 *
 * The step's body, facts and outline come from the BOOK, so in a whole-book
 * study they were the same page thirty or fifty times over. It is shown when:
 *  - the lesson authored its own context (that is about this lesson);
 *  - it is the first lesson of the study;
 *  - it is the first lesson in a different book than the one before it (a
 *    study about a person or theme moves between books);
 *  - it opens a new section of the book's outline ("hfst 12-25: Abraham"),
 *    which is what the step's placement card is for;
 *  - it is opened on its own (`standalone`: "Bestudeer dit hoofdstuk"), where
 *    there is no lesson before it.
 * Otherwise the step is left out and the lesson has five steps. The book's
 * background stays one tap away in Verdieping ("Context van <boek>").
 *
 * Stateless on purpose: decided by the study alone, so the website, the v1 API
 * and the completion route (which ticks every step of a finished lesson) all
 * arrive at the same list, and an installed app build simply receives a step
 * list one entry shorter - which it already handles.
 */
export function contextStepIsDue(
  study: CuratedStudy,
  lesson: Lesson,
  content: LessonContent | undefined,
  options: { standalone?: boolean } = {},
): boolean {
  if (options.standalone) return true;
  if (content?.context) return true;

  const ordered = [...study.lessons].sort((a, b) => a.day - b.day);
  const index = ordered.findIndex((entry) => entry.day === lesson.day);
  if (index <= 0) return true;

  const previous = ordered[index - 1];
  const here = placementOf(resolvePassage(lesson, content));
  const before = placementOf(resolvePassage(previous, getLessonContent(study.id, previous.day)));
  if (!here || !before) return true;
  if (here.book !== before.book) return true;
  return here.section !== before.section;
}

/** The step list of a lesson, with the context step only when it is due. */
function stepsFor(
  study: CuratedStudy,
  lesson: Lesson,
  content: LessonContent | undefined,
  options: { standalone?: boolean },
): StepKey[] {
  const hasContext =
    !!buildLessonContext(resolvePassage(lesson, content), content) &&
    contextStepIsDue(study, lesson, content, options);
  return resolveSteps(lesson, content, { hasContext });
}

export interface LessonCoreInput {
  study: CuratedStudy;
  lesson: Lesson;
  /** The translation the lesson opens in. */
  translation: string;
  /** Already resolved through `resolveCommentaryId`. */
  commentaryId: string;
  /**
   * The lesson is opened on its own - the single-chapter study - rather than
   * as a step in a study, so the context step is always shown.
   */
  standalone?: boolean;
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
export function buildLessonCore({ study, lesson, translation, commentaryId, standalone }: LessonCoreInput) {
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
    steps: stepsFor(study, lesson, content, { standalone }),
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
export function resolveLessonSteps(
  study: CuratedStudy,
  lesson: Lesson,
  options: { standalone?: boolean } = {},
): StepKey[] {
  return stepsFor(study, lesson, getLessonContent(study.id, lesson.day), options);
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
