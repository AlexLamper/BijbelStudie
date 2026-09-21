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

/**
 * Step 2. Where this passage sits: who wrote it, to whom, when, and where it
 * stands in the book.
 *
 * Every field is optional because the fallback is genuinely good: the book's
 * own orientation in lib/content/bibleBooks (author, date, theme, summary and
 * outline) exists for all 66 books, so this step has something honest to show
 * for any chapter of the canon without a word being written. Authored prose
 * REPLACES the book summary; the facts and the outline are always added.
 */
export interface ContextContent {
  /** One paragraph per entry. Replaces the book's own summary when present. */
  body?: string[];
  /** Extra ankers beside the ones derived from the book, e.g. a date or a ruler. */
  facts?: { label: string; value: string }[];
  /**
   * Terms worth knowing BEFORE the passage. Distinct from `DepthContent.terms`,
   * which explains what the commentary is about to use: a word you need in
   * order to read the text at all belongs here, in front of it.
   */
  terms?: { term: string; meaning: string }[];
  /** Geo images / maps strip. Defaults to true. */
  showMedia?: boolean;
}

/** Step 3. The passage itself, with as little around it as possible. */
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

/** Step 4. Commentary and media for exactly this passage. */
export interface DepthContent {
  /** Optional authored framing above the commentary. */
  body?: string[];
  /** Terms worth explaining before the commentary does. */
  terms?: { term: string; meaning: string }[];
  /** Geo images / maps strip. Defaults to true. */
  showMedia?: boolean;
}

/**
 * Step 6, "Toepassing". The personal question, the week's practice, and the
 * note both produce.
 *
 * The interface keeps the name `ReflectionContent` and the wire key
 * `reflection`: the step key is frozen (see lib/studyFlow.ts) and app builds
 * already on phones read `content.reflection`. What changed is what the step
 * asks for - an answer AND something to do with it - which is `practices`.
 */
export interface ReflectionContent {
  question: string;
  /** Sub-prompts, e.g. the Observation / Interpretation / Application framing. */
  prompts?: string[];
  placeholder?: string;
  /** Pre-set tags so the promoted note is findable at /notities. */
  noteTags?: string[];
  /**
   * Concrete things to do with this passage this week. Three is the working
   * number: one is a slogan, five is a programme nobody starts. Each one has to
   * be doable without preparation - "schrijf een keer op waar je ..." rather
   * than "overdenk ...". Falls back to the genre template in
   * lib/chapterStudyTemplate.ts.
   */
  practices?: string[];
  /** A verse to carry through the week, as a reference. */
  memoryVerse?: string;
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
  context?: ContextContent;
  word?: WordContent;
  depth?: DepthContent;
  /** Step 6 "Toepassing" - the key stays `reflection`, see above. */
  reflection?: ReflectionContent;
  quiz?: QuizContent;
}

/** studyId -> lesson day -> content. Missing entries are legal and expected. */
export type LessonContentRegistry = Record<string, Record<number, LessonContent>>;
