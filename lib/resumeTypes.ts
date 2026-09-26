/**
 * The "Verder waar je gebleven was" answer. Returned as `resume` by
 * GET /api/v1/dashboard and rendered identically by the web dashboard and the
 * Flutter app, so the two never disagree about where the user is. No database
 * imports. See DAILY_HABIT_PLAN.md §3.
 */

import type { StepKey } from './studyFlow';

export type ResumeKind = 'study' | 'chapter' | 'start';

export type ResumeStep = {
  id: StepKey;
  /** 1-based position within this lesson's real step list. */
  index: number;
  /** Number of steps this lesson actually has (context may be absent). */
  count: number;
  /** Dutch label from STEP_LABELS, e.g. "Verdieping". */
  label: string;
};

export type ResumeSchedule = {
  status: 'op-schema' | 'achter' | 'vooruit';
  /** Lessons behind/ahead; 0 when op-schema. */
  lessons: number;
};

export type ResumeItem = {
  kind: ResumeKind;
  /** Study title, or "Genesis 4" for a chapter, or a start prompt. */
  title: string;
  /** "Les 6 van 50 · Gerechtvaardigd door geloof", "12 van 50 hoofdstukken". */
  subtitle: string | null;
  studyId: string | null;
  lessonDay: number | null;
  step: ResumeStep | null;
  progress: { done: number; total: number } | null;
  schedule: ResumeSchedule | null;
  /** Today's lesson for this study is finished. */
  doneToday: boolean;
  /** Shown when doneToday, e.g. "Morgen les 7". */
  nextLabel: string | null;
  /** Button text, e.g. "Verder met stap 3", "Verder lezen". */
  cta: string;
  /**
   * Full web path. study: always /studie/<id>/<day>?stap=<step> (the step is
   * one of this lesson's real steps). chapter: /lezen?book=<book>&chapter=<n>&version=<v>
   * (the web reader's only URL form; `book` is the stored spelling). start: /studies.
   * The app maps it to its own go_router path (/studie/:id/:day?stap=, /read).
   */
  href: string;
  /** Cover image for studies, when available. */
  imageUrl: string | null;
};

/**
 * Built by lib/dashboardResume.ts `buildDashboardResume`. `primary` is the most
 * recently touched running study; a chapter only when no study is running, or
 * when the newest study has been untouched for 14 days AND a chapter was read
 * after it; otherwise the start prompt. Never null in GET /api/v1/dashboard.
 */
export type DashboardResume = {
  primary: ResumeItem;
  /** Other running studies, newest activity first, at most 3. */
  others: ResumeItem[];
};
