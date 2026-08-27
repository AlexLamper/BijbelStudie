import type { CuratedStudy, Lesson, StudyDepth } from './data/curated-studies';
import type { LessonContent } from './data/study-lessons/types';

/**
 * Pure resolution helpers for the guided study flow.
 *
 * No React, no database, no fetch - everything here is a function of the
 * authored content plus the user's settings, which is what makes the flow
 * testable and what keeps the fallback rules in exactly one place.
 */

/**
 * The five steps, in order.
 *
 * A fixed pipeline rather than a declarative per-lesson array: progress and
 * reminder copy have to be able to say "stap 3 van 5", every step is a bespoke
 * component anyway, and an authored typo in a free-form array would strand a
 * user on a step that does not render. Per-lesson variation is expressed as
 * *availability* below, not as ordering.
 */
export const STEP_ORDER = ['intro', 'word', 'depth', 'reflection', 'quiz'] as const;

export type StepKey = (typeof STEP_ORDER)[number];

/** What a resume cursor can point at. `done` means the lesson is finished. */
export type CursorStep = StepKey | 'done';

export function isStepKey(value: unknown): value is StepKey {
  return typeof value === 'string' && (STEP_ORDER as readonly string[]).includes(value);
}

/**
 * Which steps this lesson actually has.
 *
 * `intro` is the only step that disappears when unauthored - a blank
 * introduction is worse than none. Every other step has a usable fallback, so
 * the flow works before a single word of prose is written.
 */
export function resolveSteps(lesson: Lesson, content?: LessonContent): StepKey[] {
  const steps: StepKey[] = [];
  if (content?.intro) steps.push('intro');
  steps.push('word', 'depth', 'reflection');
  // Rendered optimistically: whether bijbelquiz actually has questions for this
  // passage is only known at fetch time, and the step body handles the empty
  // case itself rather than the lesson silently losing a step.
  if (content?.quiz?.enabled !== false) steps.push('quiz');
  return steps;
}

export function nextStep(steps: StepKey[], current: StepKey): CursorStep {
  const index = steps.indexOf(current);
  if (index === -1 || index === steps.length - 1) return 'done';
  return steps[index + 1];
}

export function previousStep(steps: StepKey[], current: StepKey): StepKey | null {
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1] : null;
}

/** 1-based position for "stap 2 van 5". Returns 0 when the step is not in the list. */
export function stepPosition(steps: StepKey[], current: StepKey): number {
  return steps.indexOf(current) + 1;
}

/**
 * Accepts the hyphen, en-dash and em-dash, because the authored content uses an
 * en-dash ('1-18' is written as 1–18) and hand-editing reliably produces all three.
 */
export function parseVerseRange(verseRange?: string): { start: number; end: number } | undefined {
  if (!verseRange) return undefined;
  const parts = verseRange.split(/[-–—]/);
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[parts.length - 1], 10);
  if (isNaN(start) || isNaN(end)) return undefined;
  return { start, end };
}

export interface Passage {
  book: string;
  chapter: number;
  verseRange?: string;
  verseStart: number | null;
  verseEnd: number | null;
}

/**
 * The passage a lesson reads. `content.word.passage` wins when a lesson opens by
 * reading somewhere other than the passage it is about.
 */
export function resolvePassage(lesson: Lesson, content?: LessonContent): Passage {
  const override = content?.word?.passage;
  const book = override?.book ?? lesson.book;
  const chapter = override?.chapter ?? lesson.chapter;
  const verseRange = override?.verseRange ?? lesson.verseRange;
  const range = parseVerseRange(verseRange);
  return {
    book,
    chapter,
    verseRange,
    verseStart: range?.start ?? null,
    verseEnd: range?.end ?? null,
  };
}

/**
 * Commentary preference per explanation depth, best first.
 *
 * These are the real ids from public/data/manifest.json. Matthew Henry is
 * devotional and applies the text; Dachsel is a 19th-century exegetical
 * commentary and is the closest thing in the corpus to "diepgaand historisch".
 * King Comments is the always-free fallback (see lib/proContent.ts), so a free
 * reader is never left with an empty panel.
 */
const DEPTH_COMMENTARY: Record<StudyDepth, string[]> = {
  kort: ['matthew_henry_nl', 'kingcomments_nl', 'dachsel'],
  diep: ['dachsel', 'matthew_henry_nl', 'kingcomments_nl'],
};

/**
 * Which commentary step 3 shows.
 *
 * An explicit per-study choice wins; otherwise the depth setting picks one. The
 * user's global preference is the last resort rather than the first, because
 * inside a study the study's own setting is the more specific intent.
 */
export function resolveCommentaryId(options: {
  enrollmentCommentary?: string | null;
  depth?: StudyDepth | null;
  userPreference?: string | null;
  available?: string[];
}): string {
  const available = options.available;
  const isAvailable = (id: string) => !available || available.includes(id);

  if (options.enrollmentCommentary && isAvailable(options.enrollmentCommentary)) {
    return options.enrollmentCommentary;
  }
  for (const id of DEPTH_COMMENTARY[options.depth ?? 'kort']) {
    if (isAvailable(id)) return id;
  }
  if (options.userPreference && isAvailable(options.userPreference)) {
    return options.userPreference;
  }
  return DEPTH_COMMENTARY.kort[0];
}

/** The reflection question, falling back to the lesson's legacy `focus` field. */
export function resolveReflectionQuestion(lesson: Lesson, content?: LessonContent): string {
  return content?.reflection?.question?.trim() || lesson.focus;
}

/** Total reading time, for "±35 min" on the detail page. */
export function estimateStudyMinutes(study: CuratedStudy): number {
  return study.lessons.reduce((total, lesson) => total + (lesson.estimatedMinutes ?? 12), 0);
}

export function findLesson(study: CuratedStudy, day: number): Lesson | undefined {
  return study.lessons.find((lesson) => lesson.day === day);
}

/** The day after `day`, or null when this was the last lesson. */
export function nextLessonDay(study: CuratedStudy, day: number): number | null {
  const days = study.lessons.map((lesson) => lesson.day).sort((a, b) => a - b);
  const index = days.indexOf(day);
  if (index === -1 || index === days.length - 1) return null;
  return days[index + 1];
}
