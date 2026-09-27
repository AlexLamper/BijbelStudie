/**
 * Bronnen: the confessions, forms and catechism booklets of the Dutch
 * Reformed tradition, as one in-app library (web /bronnen, app Bronnen tab).
 *
 * Two shapes live here. `RawWork` is what a data file in ./data holds (see
 * ./data/SCHEMA.md): the text as printed, Scripture references as printed.
 * `Work` is what the web pages render and what /api/v1/bronnen/<slug> ships to
 * the app: the same text with every reference parsed and, where it names
 * verses, the Statenvertaling text of those verses attached.
 *
 * `Work` is a wire contract with the app (features/bronnen/ in
 * bijbelstudie-app). Add fields freely; never rename or remove one, and never
 * change a slug or section id - both are URLs and cache keys in installed
 * builds.
 */

export type BronGroup = "belijdenis" | "catechese" | "liturgie";

export interface RawBlockHeading {
  type: "heading";
  text: string;
}

export interface RawBlockParagraph {
  type: "paragraph";
  number?: number;
  text: string;
  refs?: string[];
}

export interface RawBlockQa {
  type: "qa";
  number?: number;
  question: string;
  answer: string;
  refs?: string[];
}

export type RawBlock = RawBlockHeading | RawBlockParagraph | RawBlockQa;

export interface RawSection {
  id: string;
  number: number | null;
  label: string;
  title?: string | null;
  blocks: RawBlock[];
}

export interface WorkSource {
  name: string;
  url: string;
  edition?: string;
  retrieved?: string;
  note?: string;
}

export interface RawWork {
  slug: string;
  title: string;
  author: string | null;
  year: string;
  sectionNoun: string;
  source: WorkSource;
  rights: string;
  sections: RawSection[];
}

/** One verse of Statenvertaling text attached to a reference. */
export interface RefVerse {
  n: number;
  text: string;
}

/**
 * A Scripture reference as printed ("Rom. 14:7, 8"), resolved against the
 * canon. `book` is the /bijbel/<book> slug; `readerBook` is the key the
 * readers (web /lezen, the app's Bible tab) open a book by. `verses` is null
 * for a whole-chapter reference; `text` is present only when the verses were
 * found in the Statenvertaling.
 */
export interface ResolvedRef {
  label: string;
  book: string;
  bookName: string;
  readerBook: string;
  chapter: number;
  verses: number[] | null;
  text?: RefVerse[];
}

/** A printed reference that did not parse. Shown as plain text, never linked. */
export interface UnresolvedRef {
  label: string;
}

export type Ref = ResolvedRef | UnresolvedRef;

export function isResolvedRef(ref: Ref): ref is ResolvedRef {
  return "book" in ref;
}

export type Block =
  | RawBlockHeading
  | (Omit<RawBlockParagraph, "refs"> & { refs?: Ref[] })
  | (Omit<RawBlockQa, "refs"> & { refs?: Ref[] });

export interface Section {
  id: string;
  number: number | null;
  label: string;
  title: string | null;
  blocks: Block[];
}

export interface BronMeta {
  slug: string;
  title: string;
  /** Short name for tight places: tabs, breadcrumbs, the app's list rows. */
  shortTitle: string;
  group: BronGroup;
  author: string | null;
  year: string;
  /** Our own two-sentence introduction. Never text from the work itself. */
  description: string;
  /** SEO description for the work page. */
  seoDescription: string;
}

export interface Work extends BronMeta {
  sectionNoun: string;
  source: WorkSource;
  rights: string;
  sections: Section[];
}

/** One row of the /api/v1/bronnen index. */
export interface WorkSummary extends BronMeta {
  sectionNoun: string;
  sectionCount: number;
  questionCount: number;
  /** Content hash of the full payload: the app refetches a cached work when it changes. */
  version: string;
  sections: { id: string; number: number | null; label: string; title: string | null }[];
}
