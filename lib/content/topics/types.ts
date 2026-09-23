/**
 * "Wat zegt de Bijbel over ...?" pages under /bijbel-over.
 *
 * One page per subject that people search for in that exact phrasing. Each
 * page has to answer the question on its own: a direct answer first, then the
 * passages across both Testaments read in their context, what they do not
 * mean, and what to do with them. A set of thin pages that differ only in the
 * noun would be a doorway pattern - every topic carries its own text.
 *
 * Licensing: `quote` holds Statenvertaling text only (public domain), short and
 * always with its reference. Every other translation is referenced, never
 * quoted - NBG51, NET, HSV, BasisBijbel and KingComments text must not appear
 * here. References follow the Statenvertaling numbering, which is what the
 * reader at /lezen opens (e.g. Psalm 34:19, Jesaja 9:5).
 */

export interface TopicPassage {
  /** Book slug from lib/content/bibleBooks (e.g. "psalmen", "1-johannes"). */
  book: string;
  chapter: number;
  /** "4", "25-34". Omitted for a whole chapter. */
  verses?: string;
  /** Display override for a reference that spans chapters ("Genesis 37-50"). */
  ref?: string;
  /** Short Statenvertaling quote. Never another translation. */
  quote?: string;
  /** What the passage says, read in its own context. */
  text: string;
}

export interface TopicSection {
  /** Anchor id for the table of contents. */
  id: string;
  heading: string;
  /** Paragraphs, plain text. */
  body: string[];
  passages?: TopicPassage[];
}

export interface TopicPoint {
  title: string;
  text: string;
}

export type TopicGroup = "god-en-geloof" | "moeilijke-tijden" | "leven-uit-geloof";

export interface Topic {
  /** Last URL segment: lowercase, hyphenated. */
  slug: string;
  /**
   * The subject as it reads after "Wat zegt de Bijbel over": "angst",
   * "verdriet en rouw", "het eeuwige leven". The H1 and <title> are built from
   * it, so it must keep the whole title within 60 characters.
   */
  subject: string;
  /** Short label for the breadcrumb, cards and chips: "Angst". */
  label: string;
  group: TopicGroup;
  /** Meta description, 70-155 characters. */
  description: string;
  /** One line for the hub card. */
  summary: string;
  /** The direct, snippet-style answer under the H1: two or three sentences. */
  answer: string;
  keywords: string[];
  /** ISO dates, for the Article markup and the sitemap. Bump dateModified when the text changes. */
  datePublished: string;
  dateModified: string;
  /** The walk through the passages. */
  sections: TopicSection[];
  /** "Wat het niet betekent". */
  misunderstandings: TopicPoint[];
  /** H2 over the practice steps, phrased the way people search ("Hoe ga je om met angst?"). */
  practiceHeading: string;
  /** Numbered practice steps. */
  practice: TopicPoint[];
  /** Optional pastoral pointer to real help, shown under the practice steps. */
  careNote?: string;
  /** Three or four. Rendered visibly and as FAQPage markup. */
  faqs: { q: string; a: string }[];
  /** Other topic slugs, linked first under "Verder lezen". */
  relatedTopics: string[];
  /** Book pages, guided studies and guides that exist on the site. */
  related: { href: string; label: string; description: string }[];
}
