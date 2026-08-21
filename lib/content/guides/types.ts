/**
 * Long-form guide pages under /bijbelstudie.
 *
 * These are the site's indexable answer to the head terms ("bijbelstudie",
 * "online bijbelstudie", "gratis bijbelstudie", "bijbelstudie methoden"). The
 * app itself sits behind auth, so without these there is no crawlable page for
 * a searcher on those queries to land on.
 *
 * Each guide has to earn its URL: distinct subject, distinct body, useful on
 * its own without signing up. A set of near-identical pages differing only in
 * keyword is a doorway-page pattern and gets demoted, not ranked.
 */

export interface GuideSection {
  /** Anchor id. Used for the in-page table of contents and deep links. */
  id: string;
  heading: string;
  /** Paragraphs of body copy. Plain text - rendered as <p>. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  list?: { title: string; text: string }[];
  /** Optional numbered steps rendered after the paragraphs. */
  steps?: { title: string; text: string }[];
  /** Optional pull-quote or callout under the section. */
  callout?: string;
}

export interface Guide {
  /** Last URL segment. "" means the hub itself, /bijbelstudie. */
  slug: string;
  /** Full path, always starting at /bijbelstudie. */
  path: string;
  /** The key in lib/pageMetadata.ts that owns this page's canonical. */
  metadataKey: string;
  /** H1. Should read naturally and contain the target phrase. */
  h1: string;
  /** Short line under the H1. */
  intro: string;
  /** ISO dates for the Article structured data. */
  datePublished: string;
  dateModified: string;
  /** Reading time shown to the reader, in minutes. */
  readingMinutes: number;
  sections: GuideSection[];
  faqs?: { q: string; a: string }[];
  /** Internal links rendered at the foot of the page. */
  related: { href: string; label: string; description: string }[];
}
