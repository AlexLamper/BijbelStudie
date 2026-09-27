import { workCountLabel } from "./labels";
import { sectionKicker, sectionTitle, themeRanges, type ThemeRange } from "./themes";
import type { BronGroup, Section, Work } from "./types";

/**
 * The compact shapes the Bronnen pages hand to their client components: ids,
 * labels and a one-line opening per section, never the full text. Built at
 * build time from a loaded Work; pure, safe anywhere.
 */

export interface SectionCard {
  id: string;
  kicker: string;
  title: string | null;
  /** Empty when the caller asked for a card without openings. */
  opening: string;
}

export interface WorkCard {
  slug: string;
  title: string;
  shortTitle: string;
  group: BronGroup;
  author: string | null;
  year: string;
  description: string;
  sectionNoun: string;
  countLabel: string;
  sections: SectionCard[];
}

/** The text a section opens with, cut at a word to at most `max` characters. */
export function sectionOpening(section: Section, max = 170): string {
  const first = section.blocks.find(b => b.type !== "heading");
  if (!first) return "";
  const text = (first.type === "qa" ? first.question : first.text).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function sectionCard(work: Work, section: Section, withOpening = true): SectionCard {
  const kicker = sectionKicker(section, work.sectionNoun);
  const title = sectionTitle(work.slug, section);
  return {
    id: section.id,
    kicker,
    title: title && title !== kicker ? title : null,
    opening: withOpening ? sectionOpening(section) : "",
  };
}

/** `withOpenings: false` for pages that list works but never a section's text (/bronnen). */
export function workCard(work: Work, withOpenings = true): WorkCard {
  return {
    slug: work.slug,
    title: work.title,
    shortTitle: work.shortTitle,
    group: work.group,
    author: work.author,
    year: work.year,
    description: work.description,
    sectionNoun: work.sectionNoun,
    countLabel: workCountLabel(work),
    sections: work.sections.map(section => sectionCard(work, section, withOpenings)),
  };
}

export function workThemes(work: Work): ThemeRange[] {
  return themeRanges(work.slug, work.sections);
}

/** One Heidelberg zondag for the "Deze week" card. */
export interface ZondagCard {
  id: string;
  number: number;
  topic: string | null;
  /** "Vraag 104" or "Vraag 92–95". */
  questions: string;
}

export function zondagCards(work: Work): ZondagCard[] {
  return work.sections
    .filter(s => s.number != null)
    .map(s => {
      const numbers = s.blocks.flatMap(b => (b.type === "qa" && b.number != null ? [b.number] : []));
      const a = numbers[0];
      const b = numbers[numbers.length - 1];
      const questions =
        a == null ? "" : a === b ? `Vraag ${a}` : `Vragen ${a}–${b}`;
      return { id: s.id, number: s.number!, topic: sectionTitle(work.slug, s), questions };
    });
}
