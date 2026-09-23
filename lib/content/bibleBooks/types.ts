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
   * Book key used by the reader at /lezen?book=... - see the naming rule
   * above. Defaults to `name` when omitted.
   */
  appBook?: string;
}

/**
 * The long-form content of /bijbelboeken/[slug], and ONLY of that page.
 *
 * Why this is not part of BibleBook: `summary`, `outline`, `theme`, `author`
 * and `written` are also rendered by /studies/boek-<slug> and by the context
 * step of every lesson (lib/lessonContext.ts). A book page built from those
 * fields alone was ~400 words inside a template that repeats on all 66 pages,
 * and Search Console reported it as "Dubbele pagina, Google heeft een andere
 * canonieke pagina gekozen". Everything here is written for the book page and
 * must not be reused elsewhere, so the page keeps a core of text that exists
 * nowhere else on the site. It lives in its own module (./detail) so the
 * lesson flow and client bundles that import BIBLE_BOOKS never pull it in.
 *
 * References only, never quoted Bible text from a licensed translation. The
 * Statenvertaling is public domain and may be quoted sparingly.
 */
export interface BookDetail {
  slug: string;
  /** Direct, snippet-style answer to "Waar gaat {boek} over?". 1-2 sentences. */
  aboutAnswer: string;
  /** "Wie schreef {boek}?": a direct answer, then the fuller picture. */
  author: { answer: string; detail: string };
  /** "Wanneer is {boek} geschreven?": a direct answer, then the setting. */
  date: { answer: string; detail: string };
  /**
   * The book block by block. Ranges and titles follow `outline` so the page
   * and the lessons agree; `text` goes well beyond the outline's one line.
   * `chapter` is the first chapter of the block (the link target). One-chapter
   * books split by verses, e.g. range "vers 1-4".
   */
  structure: { range: string; chapter: number; title: string; text: string }[];
  /** Three core themes, each with a short explanation and references. */
  themes: { title: string; text: string }[];
  /** Well-known passages: reference, first chapter, name, why it matters. */
  passages: { ref: string; chapter: number; title: string; text: string }[];
  /** Place in the whole of Scripture: links back and forward, and to Christ. */
  inScripture: string[];
  /** Book-specific advice on how to read it. */
  readingTip: string;
  /** Two or three books to read alongside, with the reason. Slugs. */
  related: { slug: string; reason: string }[];
}
