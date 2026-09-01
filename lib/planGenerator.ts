import {
  PLAN_BOOKS,
  nextPlanBook,
  resolvePlanBook,
  type PlanBook,
  type PlanCategory,
} from './planCanon';

/**
 * Turns "I want to do Job in 30 days" into the day-by-day readings a
 * `BiblePlan` document stores.
 *
 * Chapter granularity is the floor: the repo has no verse counts and no
 * pericope data (see lib/local-data.ts - verse counts are only knowable by
 * loading a chapter and counting keys), so a day is a whole number of chapters.
 */

export type Pace = 'rustig' | 'gestaag' | 'stevig';

export const PACE_CHAPTERS_PER_DAY: Record<Pace, number> = {
  rustig: 1,
  gestaag: 2,
  stevig: 4,
};

export const PACE_LABELS: Record<Pace, string> = {
  rustig: 'Rustig - 1 hoofdstuk per dag',
  gestaag: 'Gestaag - 2 hoofdstukken per dag',
  stevig: 'Stevig - 4 hoofdstukken per dag',
};

export function isPace(value: unknown): value is Pace {
  return value === 'rustig' || value === 'gestaag' || value === 'stevig';
}

export type GeneratedReading = {
  day: number;
  book: string;
  chapter: number;
  title?: string;
};

export type GenerateResult = {
  readings: GeneratedReading[];
  /** Actual number of days used, which can be fewer than requested. */
  duration: number;
  totalChapters: number;
  category: PlanCategory;
  /** Human-readable notes for the UI: unknown books, clamped duration. */
  warnings: string[];
};

/** Every chapter of every requested book, in canonical order. */
function expandChapters(books: PlanBook[]): { book: PlanBook; chapter: number }[] {
  const out: { book: PlanBook; chapter: number }[] = [];
  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      out.push({ book, chapter });
    }
  }
  return out;
}

/** "Job 1–3", or "Job 1" for a single chapter, or "Job 42 · Psalmen 1". */
function dayTitle(entries: { book: PlanBook; chapter: number }[]): string {
  const parts: string[] = [];
  let index = 0;
  while (index < entries.length) {
    const book = entries[index].book;
    let end = index;
    while (end + 1 < entries.length && entries[end + 1].book === book) end++;
    const first = entries[index].chapter;
    const last = entries[end].chapter;
    parts.push(first === last ? `${book.nl} ${first}` : `${book.nl} ${first}–${last}`);
    index = end + 1;
  }
  return parts.join(' · ');
}

/** Days needed to cover `totalChapters` at the given pace. */
export function recommendedDuration(totalChapters: number, pace: Pace): number {
  return Math.max(1, Math.ceil(totalChapters / PACE_CHAPTERS_PER_DAY[pace]));
}

/**
 * Spreads the chapters of `bookNames` across `durationDays` as evenly as
 * possible; the remainder lands on the earliest days so the plan front-loads
 * rather than ending on a heavy one.
 *
 * Asking for more days than there are chapters is not an error - the plan is
 * simply as long as it can be, and the caller is told so.
 */
export function generateReadings(options: {
  bookNames: string[];
  durationDays: number;
}): GenerateResult {
  const warnings: string[] = [];
  const books: PlanBook[] = [];

  for (const name of options.bookNames) {
    const book = resolvePlanBook(name);
    if (!book || book.chapters === 0) {
      warnings.push(`Boek niet herkend en overgeslagen: ${name}`);
      continue;
    }
    if (!books.includes(book)) books.push(book);
  }

  if (books.length === 0) {
    return { readings: [], duration: 0, totalChapters: 0, category: 'overig', warnings };
  }

  const chapters = expandChapters(books);
  const totalChapters = chapters.length;

  let duration = Math.max(1, Math.floor(options.durationDays));
  if (duration > totalChapters) {
    warnings.push(
      `Deze selectie telt ${totalChapters} hoofdstukken, dus het plan duurt ${totalChapters} dagen in plaats van ${duration}.`,
    );
    duration = totalChapters;
  }

  const base = Math.floor(totalChapters / duration);
  const remainder = totalChapters % duration;

  const readings: GeneratedReading[] = [];
  let cursor = 0;
  for (let day = 1; day <= duration; day++) {
    const take = base + (day <= remainder ? 1 : 0);
    const entries = chapters.slice(cursor, cursor + take);
    cursor += take;

    const title = dayTitle(entries);
    entries.forEach((entry, indexInDay) => {
      readings.push({
        day,
        book: entry.book.nl,
        chapter: entry.chapter,
        // Only the first entry of a day carries the label, so the day card has
        // exactly one heading no matter how many chapters it holds.
        ...(indexInDay === 0 ? { title } : {}),
      });
    });
  }

  // A mixed-testament selection has no single honest category.
  const categories = new Set(books.map((b) => b.category));
  const category: PlanCategory = categories.size === 1 ? books[0].category : 'overig';

  return { readings, duration, totalChapters, category, warnings };
}

// ── Suggestions ────────────────────────────────────────────────────────────

export type PlanSuggestion = {
  /** Stable key so the client can dedupe and the server can rebuild it. */
  key: string;
  title: string;
  description: string;
  /** Why the user is seeing this one, shown verbatim in the UI. */
  reason: string;
  bookNames: string[];
  totalChapters: number;
  recommendedDays: number;
  category: PlanCategory;
};

function suggestionForBook(book: PlanBook, reason: string, pace: Pace): PlanSuggestion {
  return {
    key: `book:${book.en}`,
    title: `${book.nl} in ${recommendedDuration(book.chapters, pace)} dagen`,
    description: `Lees en bestudeer ${book.nl} van begin tot eind - ${book.chapters} hoofdstukken.`,
    reason,
    bookNames: [book.nl],
    totalChapters: book.chapters,
    recommendedDays: recommendedDuration(book.chapters, pace),
    category: book.category,
  };
}

/** Chapters of `book` the user has already opened, per User.readChapters. */
function chaptersReadIn(book: PlanBook, readChapters: Record<string, number[]>): number {
  const seen = new Set<number>();
  for (const [name, chapters] of Object.entries(readChapters)) {
    if (resolvePlanBook(name) !== book) continue;
    for (const chapter of chapters) seen.add(chapter);
  }
  return seen.size;
}

/**
 * The example from the brief: someone whose last read was Job is offered a Job
 * plan. If they have already been most of the way through it, offering it again
 * is noise - they get the next book instead.
 *
 * Evergreen fallbacks fill the list so a brand-new account still sees three
 * options rather than an empty state.
 */
export function suggestPlans(input: {
  lastReadBook?: string | null;
  readChapters?: Record<string, number[]>;
  pace?: Pace;
  limit?: number;
}): PlanSuggestion[] {
  const pace = input.pace ?? 'gestaag';
  const readChapters = input.readChapters ?? {};
  const limit = input.limit ?? 4;
  const suggestions: PlanSuggestion[] = [];
  const used = new Set<string>();

  const push = (suggestion: PlanSuggestion) => {
    if (used.has(suggestion.key)) return;
    used.add(suggestion.key);
    suggestions.push(suggestion);
  };

  const lastBook = resolvePlanBook(input.lastReadBook);
  if (lastBook && lastBook.chapters > 0) {
    const read = chaptersReadIn(lastBook, readChapters);
    const coverage = read / lastBook.chapters;

    if (coverage < 0.8) {
      push(
        suggestionForBook(
          lastBook,
          `Je las als laatste in ${lastBook.nl}. Maak het af met een plan.`,
          pace,
        ),
      );
    }

    const next = nextPlanBook(lastBook);
    if (next && next.chapters > 0) {
      push(
        suggestionForBook(
          next,
          coverage >= 0.8
            ? `Je hebt ${lastBook.nl} vrijwel uit - ${next.nl} volgt erop.`
            : `Na ${lastBook.nl} volgt ${next.nl}.`,
          pace,
        ),
      );
    }
  }

  // Short, well-trodden books make a first plan finishable.
  const evergreens = ['John', 'Mark', 'Philippians', 'Psalms', 'Ruth', 'James'];
  for (const en of evergreens) {
    if (suggestions.length >= limit) break;
    const book = PLAN_BOOKS.find((b) => b.en === en);
    if (!book || book.chapters === 0) continue;
    if (chaptersReadIn(book, readChapters) / book.chapters >= 0.8) continue;
    push(suggestionForBook(book, 'Een goed begin voor een eerste leesplan.', pace));
  }

  return suggestions.slice(0, limit);
}
