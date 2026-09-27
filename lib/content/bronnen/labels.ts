import type { Section, Work } from "./types";

/** Display helpers shared by the pages; no I/O, safe anywhere. */

const PLURAL: Record<string, string> = {
  zondag: "zondagen",
  artikel: "artikelen",
  hoofdstuk: "hoofdstukken",
  formulier: "formulieren",
  gebed: "gebeden",
  belijdenis: "belijdenissen",
  deel: "delen",
};

/** "zondagen", "hoofdstukken"; unknown nouns are returned unchanged. */
export function pluralNoun(noun: string): string {
  const lower = noun.toLowerCase();
  return PLURAL[lower] ?? lower;
}

export function questionCount(work: Pick<Work, "sections">): number {
  return work.sections.reduce((n, s) => n + s.blocks.filter(b => b.type === "qa").length, 0);
}

/** "52 zondagen · 129 vragen", "37 artikelen". */
export function workCountLabel(work: Pick<Work, "sections" | "sectionNoun">): string {
  const n = work.sections.length;
  const noun = work.sectionNoun.toLowerCase();
  const sections = `${n} ${n === 1 ? noun : PLURAL[noun] ?? noun}`;
  const q = questionCount(work);
  // One undivided section ("Vragen en antwoorden"): only the questions count.
  if (n === 1 && q > 0) return `${q} ${q === 1 ? "vraag" : "vragen"}`;
  return q > 0 ? `${sections} · ${q} ${q === 1 ? "vraag" : "vragen"}` : sections;
}

/** "Zondag 1 · Van de enige troost", or just the label. */
export function sectionHeading(section: Pick<Section, "label" | "title">): string {
  return section.title ? `${section.label} · ${section.title}` : section.label;
}

/** Plain-text opening of a section, for meta descriptions and previews. */
export function sectionPreview(section: Section, max = 155): string {
  const parts: string[] = [];
  for (const block of section.blocks) {
    if (block.type === "qa") parts.push(`${block.question} ${block.answer}`);
    else parts.push(block.text);
    if (parts.join(" ").length > max) break;
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
