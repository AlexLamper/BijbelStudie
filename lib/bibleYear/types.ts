/**
 * Wire shapes for "Bijbel in een jaar" (1- and 2-year whole-Bible reading
 * plans). No database imports, so client components can `import type` these.
 *
 * This file is the contract shared by the schedule core (lib/bibleYear/*),
 * the API (app/api/v1/bible-year/**), the web UI (components/bibleYear/*) and
 * the Flutter app (features/bible_year/). Change it only in the same pass as
 * all of them. See DAILY_HABIT_PLAN.md §4.
 */

export type BibleYearPlanKey = 'jaar-1' | 'jaar-2';

/** 'gemengd' = OT / NT / Psalmen+Spreuken side by side; 'canoniek' = Genesis to Openbaring. */
export type BibleYearTrackKey = 'gemengd' | 'canoniek';

/** Which strand of the day a portion belongs to. 'all' is the single canonical strand. */
export type BibleYearStrand = 'ot' | 'nt' | 'poetry' | 'all';

export type BibleYearStatus = 'active' | 'completed' | 'abandoned';

/** One chapter reference. `book` is the canonical Dutch name as used in `readChapters`. */
export type BibleYearRef = {
  book: string;
  /** Stable machine code (see lib/bookCanon.ts), e.g. "GEN". */
  code: string;
  chapter: number;
};

export type BibleYearRefState = BibleYearRef & { read: boolean };

export type BibleYearPortion = {
  strand: BibleYearStrand;
  /** Human label, e.g. "Genesis 4-6" or "Psalm 5". */
  label: string;
  refs: BibleYearRef[];
};

/** A day in the static schedule. `day` is 1-based. */
export type BibleYearScheduleDay = {
  day: number;
  portions: BibleYearPortion[];
  /** Estimated reading time in minutes, rounded. */
  minutes: number;
};

export type BibleYearSchedule = {
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  version: number;
  totalDays: number;
  days: BibleYearScheduleDay[];
};

export type BibleYearCatalogueEntry = {
  planKey: BibleYearPlanKey;
  label: string; // "1 jaar" / "2 jaar"
  totalDays: number;
  minutesPerDay: number;
};

export type BibleYearTrackEntry = {
  track: BibleYearTrackKey;
  label: string; // "Gemengd" / "Van Genesis tot Openbaring"
  description: string;
};

export type BibleYearEnrollmentDTO = {
  id: string;
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  scheduleVersion: number;
  /** 'YYYY-MM-DD' in the user's time zone. */
  startDate: string;
  timeZone: string;
  shiftDays: number;
  status: BibleYearStatus;
  totalDays: number;
  chaptersRead: number;
  /** 0-100, share of the 1189 chapters read within this plan. */
  percentBible: number;
  /** 'YYYY-MM-DD', start + totalDays - 1 + shiftDays. */
  expectedEndDate: string;
  completedAt: string | null;
};

export type BibleYearPortionState = Omit<BibleYearPortion, 'refs'> & {
  refs: BibleYearRefState[];
  done: boolean;
};

/** Everything a "Vandaag" card, the resume card and the notification schedule need. */
export type BibleYearToday = {
  /** Scheduled day for today (1..totalDays), after shiftDays. 0 before the start date. */
  dayNumber: number;
  totalDays: number;
  /** 'YYYY-MM-DD' in the user's time zone. */
  localDate: string;
  portions: BibleYearPortionState[];
  todayDone: boolean;
  /** Days before today with unread chapters. */
  behindDays: number;
  /** Future days already fully read. */
  aheadDays: number;
  /** Oldest first, at most 7. */
  backlogDays: { day: number; label: string }[];
  percentBible: number;
  expectedEndDate: string;
  minutesEstimate: number;
  /** Web path of the plan page. The app maps it to its own route. */
  href: '/studies/bijbel-in-een-jaar';
};

/** GET /api/v1/bible-year */
export type BibleYearStateResponse = {
  catalogue: BibleYearCatalogueEntry[];
  tracks: BibleYearTrackEntry[];
  enrollment: BibleYearEnrollmentDTO | null;
  today: BibleYearToday | null;
};

/** POST /api/v1/bible-year (409 when an active plan exists). */
export type BibleYearStartBody = {
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  /** 'YYYY-MM-DD', today or later in the user's time zone. */
  startDate: string;
  timeZone?: string;
};

/** PATCH /api/v1/bible-year */
export type BibleYearPatchBody =
  | { action: 'shift' } // move the schedule forward by behindDays
  | { action: 'stop' } // status -> abandoned (document kept)
  | ({ action: 'restart' } & BibleYearStartBody); // abandon current, start new

/** POST /api/v1/bible-year/mark */
export type BibleYearMarkBody =
  | { refs: { code: string; chapter: number }[]; read: boolean }
  | { day: number; read: boolean };

/** Response of POST/PATCH/mark: the fresh state. */
export type BibleYearMutationResponse = Pick<BibleYearStateResponse, 'enrollment' | 'today'>;
