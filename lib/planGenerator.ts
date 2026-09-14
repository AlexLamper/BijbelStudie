import {
  PLAN_BOOKS,
  nextPlanBook,
  resolvePlanBook,
  type PlanBook,
  type PlanCategory,
} from './planCanon';

/**
 * Plan suggestions for the dashboard: "you last read Job, here is a Job plan".
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

/** Days needed to cover `totalChapters` at the given pace. */
export function recommendedDuration(totalChapters: number, pace: Pace): number {
  return Math.max(1, Math.ceil(totalChapters / PACE_CHAPTERS_PER_DAY[pace]));
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
