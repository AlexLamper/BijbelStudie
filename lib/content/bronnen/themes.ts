import type { Section } from "./types";

/**
 * Web-only reading aids for the Bronnen pages: the themes a work's table of
 * contents is grouped by, and a subject line for each Heidelberg zondag (the
 * data files print none). Both are our own labels, never text from the works,
 * and neither is part of the /api/v1/bronnen wire contract.
 *
 * A theme names its first and last section by id, so it survives works whose
 * sections are unnumbered (formulieren, gebeden).
 */

export interface BronTheme {
  label: string;
  first: string;
  last: string;
}

export const BRON_THEMES: Record<string, BronTheme[]> = {
  "nederlandse-geloofsbelijdenis": [
    { label: "God en de Schrift", first: "artikel-1", last: "artikel-11" },
    { label: "Schepping en zonde", first: "artikel-12", last: "artikel-15" },
    { label: "Verkiezing en Christus", first: "artikel-16", last: "artikel-21" },
    { label: "Rechtvaardiging en heiliging", first: "artikel-22", last: "artikel-26" },
    { label: "De kerk", first: "artikel-27", last: "artikel-32" },
    { label: "De sacramenten", first: "artikel-33", last: "artikel-35" },
    { label: "Overheid en oordeel", first: "artikel-36", last: "artikel-37" },
  ],
  "heidelbergse-catechismus": [
    { label: "De enige troost", first: "zondag-1", last: "zondag-1" },
    { label: "Ellende", first: "zondag-2", last: "zondag-4" },
    { label: "Verlossing", first: "zondag-5", last: "zondag-31" },
    { label: "Dankbaarheid", first: "zondag-32", last: "zondag-52" },
  ],
  "liturgische-formulieren": [
    { label: "Sacramenten", first: "doop-kinderen", last: "avondmaal" },
    { label: "Tucht", first: "afsnijding", last: "wederopneming" },
    { label: "Bevestiging", first: "bevestiging-dienaren", last: "huwelijk" },
  ],
  "christelijke-gebeden": [
    { label: "Eredienst", first: "bede-bij-den-aanvang", last: "gebed-na-de-catechismus" },
    { label: "Thuis", first: "gebed-voor-het-eten", last: "avondgebed" },
    { label: "Kerkelijke vergaderingen", first: "gebed-voor-de-kerkelijke-vergadering", last: "gebed-voor-de-vergadering-der-diakenen" },
  ],
};

/** Subject of each Heidelberg zondag, 1-52, in today's spelling. */
export const HC_TOPICS: readonly string[] = [
  "De enige troost",
  "De kennis van de ellende",
  "Schepping en val van de mens",
  "Gods rechtvaardigheid",
  "De noodzaak van een Middelaar",
  "De ware Middelaar",
  "Het ware geloof",
  "De drie-enige God",
  "God de Vader en de schepping",
  "De voorzienigheid",
  "Jezus, de Zaligmaker",
  "Christus, de Gezalfde",
  "Gods eniggeboren Zoon, onze Heere",
  "De menswording",
  "Het lijden van Christus",
  "Dood, begrafenis en nederdaling ter hel",
  "De opstanding",
  "De hemelvaart",
  "Aan Gods rechterhand; de wederkomst",
  "De Heilige Geest",
  "De kerk en de vergeving van zonden",
  "Opstanding van het vlees en eeuwig leven",
  "De rechtvaardiging door het geloof",
  "Goede werken en genade",
  "Het Woord en de sacramenten",
  "De heilige doop",
  "De doop en de wedergeboorte",
  "Het heilig avondmaal",
  "Brood en wijn",
  "Het avondmaal en de mis",
  "De sleutels van het Koninkrijk",
  "Dankbaarheid en goede werken",
  "De ware bekering",
  "De wet en het eerste gebod",
  "Het tweede gebod",
  "Het derde gebod",
  "De eed",
  "Het vierde gebod",
  "Het vijfde gebod",
  "Het zesde gebod",
  "Het zevende gebod",
  "Het achtste gebod",
  "Het negende gebod",
  "Het tiende gebod en het gebruik van de wet",
  "Het gebed",
  "Onze Vader, Die in de hemelen zijt",
  "De eerste bede",
  "De tweede bede",
  "De derde bede",
  "De vierde bede",
  "De vijfde bede",
  "De zesde bede en het slot",
];

/** A themed slice of a work: the indexes it spans and the label for its range. */
export interface ThemeRange {
  label: string;
  /** Inclusive indexes into work.sections. */
  from: number;
  to: number;
  /** "1–11", "1"; section numbers when both ends have one, else positions. */
  range: string;
}

export function themeRanges(slug: string, sections: Pick<Section, "id" | "number">[]): ThemeRange[] {
  const themes = BRON_THEMES[slug];
  if (!themes) return [];
  const out: ThemeRange[] = [];
  for (const theme of themes) {
    const from = sections.findIndex(s => s.id === theme.first);
    const to = sections.findIndex(s => s.id === theme.last);
    if (from < 0 || to < from) continue;
    const a = sections[from].number ?? from + 1;
    const b = sections[to].number ?? to + 1;
    out.push({ label: theme.label, from, to, range: a === b ? `${a}` : `${a}–${b}` });
  }
  return out;
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The small label above a section's title: "Artikel 6", "Gebed 11",
 * "Eerste hoofdstuk", "Inleiding". An ordinal label ("Derde en vierde
 * hoofdstuk") or a section without a number is used as printed.
 */
export function sectionKicker(section: Pick<Section, "label" | "number">, sectionNoun: string): string {
  const noun = sectionNoun.toLowerCase();
  const ordinal = new RegExp(`\\s${noun}$`, "i").test(section.label);
  if (ordinal || section.number == null) return section.label;
  return `${capitalise(noun)} ${section.number}`;
}

/** The section's title for cards and the reader: printed title, zondag subject, else null. */
export function sectionTitle(slug: string, section: Pick<Section, "title" | "number" | "label">): string | null {
  if (section.title) return section.title;
  if (slug === "heidelbergse-catechismus" && section.number != null) return HC_TOPICS[section.number - 1] ?? null;
  return null;
}

/** "Artikel", "Zondag": the noun as a heading word. */
export function nounTitle(sectionNoun: string): string {
  return capitalise(sectionNoun.toLowerCase());
}
