/**
 * Hand-authored lesson prose for the guided study flow.
 *
 * Deliberately kept OUT of lib/data/curated-studies.ts. That module is imported
 * by `/studies`, which is a client component, so anything living there is
 * shipped to every browser that opens the catalogue. The catalogue needs titles
 * and lesson lists; it does not need every paragraph of every study.
 *
 * Every field here is optional. `lib/studyFlow.ts` has a fallback for each one,
 * so the flow ships working with zero authored prose and improves study by
 * study - the alternative was blocking the release on ~180 written blocks.
 */

/** Step 1. Sets the context before the reader meets the text. */
export interface IntroContent {
  headline: string;
  /** One paragraph per entry. */
  body: string[];
  /** "Let hier op tijdens het lezen" - rendered as a short list. */
  watchFor?: string[];
}

/** Step 2. The passage itself, with as little around it as possible. */
export interface WordContent {
  /**
   * Only when the reading differs from the passage the lesson is *about* - a
   * lesson on Genesis 22 that opens by reading Hebreeen 11, for instance.
   * Omitted means: use the lesson's own book/chapter/verseRange.
   */
  passage?: { book: string; chapter: number; verseRange?: string };
  /** One sentence above the text. "Lees rustig. Let op wat Thomas zegt." */
  readingCue?: string;
}

/** Step 3. Commentary and media for exactly this passage. */
export interface DepthContent {
  /** Optional authored framing above the commentary. */
  body?: string[];
  /** Terms worth explaining before the commentary does. */
  terms?: { term: string; meaning: string }[];
  /** Geo images / maps strip. Defaults to true. */
  showMedia?: boolean;
}

/** Step 4. The personal question and the note it produces. */
export interface ReflectionContent {
  question: string;
  /** Sub-prompts, e.g. the Observation / Interpretation / Application framing. */
  prompts?: string[];
  placeholder?: string;
  /** Pre-set tags so the promoted note is findable at /notities. */
  noteTags?: string[];
}

/** Step 5. Which bijbelquiz questions close this lesson. */
export interface QuizContent {
  /**
   * Explicit bijbelquiz slugs. When set, question selection is exact and never
   * depends on parsing free-text bibleReference - this is the path to use.
   */
  quizSlugs?: string[];
  /** Default 5, capped at 10 by the API. */
  questionCount?: number;
  /** false = this lesson deliberately has no quiz. */
  enabled?: boolean;
}

export interface LessonContent {
  intro?: IntroContent;
  word?: WordContent;
  depth?: DepthContent;
  reflection?: ReflectionContent;
  quiz?: QuizContent;
}

/** studyId -> lesson day -> content. Missing entries are legal and expected. */
export type LessonContentRegistry = Record<string, Record<number, LessonContent>>;
