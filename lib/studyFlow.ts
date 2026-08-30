import type { CuratedStudy, Lesson } from './data/curated-studies';
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
 * The commentary shown when nothing else is chosen.
 *
 * Matthew Henry is devotional, in Dutch, and present for effectively every
 * passage in the corpus - so it is a safe floor. Dachsel is deliberately NOT a
 * default: it is a 19th-century exegetical commentary that is missing for many
 * chapters, and defaulting to it strands the reader with an empty panel.
 */
const DEFAULT_COMMENTARY = 'matthew_henry_nl';

/**
 * Which commentary step 3 shows.
 *
 * Order: an explicit per-study choice, then the reader's own setting from
 * reading preferences, then Matthew Henry. A commentary is never auto-picked
 * from the study's depth setting - only a choice the reader actually made
 * counts, otherwise the fallback applies.
 */
export function resolveCommentaryId(options: {
  enrollmentCommentary?: string | null;
  userPreference?: string | null;
  available?: string[];
}): string {
  const available = options.available;
  const isAvailable = (id: string) => !available || available.includes(id);

  if (options.enrollmentCommentary && isAvailable(options.enrollmentCommentary)) {
    return options.enrollmentCommentary;
  }
  if (options.userPreference && isAvailable(options.userPreference)) {
    return options.userPreference;
  }
  return DEFAULT_COMMENTARY;
}

/** The reflection question, falling back to the lesson's legacy `focus` field. */
export function resolveReflectionQuestion(lesson: Lesson, content?: LessonContent): string {
  return content?.reflection?.question?.trim() || lesson.focus;
}

/** Total reading time, for "±35 min" on the detail page. */
export function estimateStudyMinutes(study: CuratedStudy): number {
  return study.lessons.reduce((total, lesson) => total + (lesson.estimatedMinutes ?? 12), 0);
}

/**
 * That total, in words a reader can picture.
 *
 * A whole-book study is fifty chapters, and "± 500 min" is a number nobody
 * converts in their head - it reads as a wall rather than as a commitment. Past
 * an hour and a half this switches to hours, rounded to the half.
 */
export function formatStudyMinutes(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round(minutes / 30) / 2;
  return `${hours.toString().replace('.', ',')} uur`;
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
