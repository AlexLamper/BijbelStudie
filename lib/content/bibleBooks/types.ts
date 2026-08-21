/**
 * Reference data for the 66 books of the Protestant canon, used by
 * /bijbelboeken and /bijbelboeken/[slug].
 *
 * Naming rule: `name` and `appBook` are separate on purpose. `name` is the
 * spelling we show and put in the URL slug; `appBook` must match the key the
 * Bible data is stored under (public/data/manifest.json), including its
 * quirks - the Statenvertaling files use "2 Corinthiër" without the final s,
 * and a deep link built from `name` would 404 inside the reader.
 *
 * Authorship is stated the way mainstream scholarship states it. Where the
 * book itself is anonymous, that is said plainly rather than asserting a
 * traditional attribution as fact.
 */

export type Testament = "oude-testament" | "nieuwe-testament";

export type BookGenre =
  | "Wet"
  | "Geschiedenis"
  | "Poëzie en wijsheid"
  | "Grote profeten"
  | "Kleine profeten"
  | "Evangelie"
  | "Brief"
  | "Apocalyptiek";

export interface OutlineSection {
  /** e.g. "1-11" or "1" */
  range: string;
  title: string;
  summary: string;
}

export interface BibleBook {
  /** URL segment. Lowercase, ASCII, hyphenated. */
  slug: string;
  /** Display name, Statenvertaling spelling. */
  name: string;
  /** Canonical position, 1-66. */
  position: number;
  testament: Testament;
  genre: BookGenre;
  chapters: number;
  /** Who wrote it, phrased honestly about what is and is not known. */
  author: string;
  /** When it was written or reached its final form. */
  written: string;
  /** One sentence: what this book is fundamentally about. */
  theme: string;
  /** Meta description and card blurb. Aim for 140-160 characters. */
  blurb: string;
  /** Two or three paragraphs of orientation. */
  summary: string[];
  outline: OutlineSection[];
  /** References only, in Statenvertaling spelling. */
  keyVerses: string[];
  /** Questions that push a reader into the text rather than around it. */
  studyQuestions: string[];
  /**
   * Book key used by the reader at /studie?book=... - see the naming rule
   * above. Defaults to `name` when omitted.
   */
  appBook?: string;
}
