import type { BronGroup, BronMeta } from "./types";

/**
 * The works in the Bronnen library, in display order. This list is the source
 * of truth for everything shown ABOUT a work (title, author, year, our own
 * introduction); the data file in ./data/<slug>.json holds the work's own text
 * and its provenance. A work listed here without a data file is simply not
 * published - no page, no API entry, no sitemap row.
 *
 * Licensing: every work here must be public domain in the text we ship (this
 * repo is public, the app is sold). Not added on purpose:
 * - "Hellenbroek hertaald" (GBS, 2017): a modern rewording under copyright.
 * - C.S. Lewis, Mere Christianity / Onversneden christendom: Lewis died in
 *   1963, so the work is protected in the EU until 1 January 2034, and the
 *   Dutch translation separately.
 * - Any text taken from GBS Bijbel Online (bijbel-statenvertaling.com): those
 *   are the foundation's own editions, marked with a copyright sign.
 */

export const BRON_GROUPS: { id: BronGroup; label: string; description: string }[] = [
  {
    id: "belijdenis",
    label: "Belijdenisgeschriften",
    description: "Wat de kerk belijdt: de drie algemene belijdenissen en de Drie Formulieren van Enigheid.",
  },
  {
    id: "catechese",
    label: "Catechese",
    description: "Vragen en antwoorden om de leer van de Schrift te leren kennen.",
  },
  {
    id: "liturgie",
    label: "Liturgie en troost",
    description: "De formulieren en gebeden van de eredienst, en troost voor zieken.",
  },
];

export const BRONNEN: BronMeta[] = [
  {
    slug: "drie-algemene-belijdenissen",
    title: "De drie algemene belijdenissen",
    shortTitle: "Algemene belijdenissen",
    group: "belijdenis",
    author: null,
    year: "4e–6e eeuw",
    description:
      "De Apostolische Geloofsbelijdenis, de Geloofsbelijdenis van Nicea en de Geloofsbelijdenis van Athanasius: de belijdenissen uit de vroege kerk die de christelijke kerk wereldwijd deelt.",
    seoDescription:
      "De Apostolische Geloofsbelijdenis, de Geloofsbelijdenis van Nicea en de Geloofsbelijdenis van Athanasius, in de vertrouwde Nederlandse tekst.",
  },
  {
    slug: "nederlandse-geloofsbelijdenis",
    title: "Nederlandse Geloofsbelijdenis",
    shortTitle: "Geloofsbelijdenis",
    group: "belijdenis",
    author: "Guido de Brès",
    year: "1561",
    description:
      "Geschreven door Guido de Brès in een tijd van vervolging in de Zuidelijke Nederlanden. In 37 artikelen belijdt ze het geloof van de gereformeerde kerken, van de kennis van God tot de wederkomst van Christus.",
    seoDescription:
      "De Nederlandse Geloofsbelijdenis (Guido de Brès, 1561) online lezen: alle 37 artikelen, met de Schriftplaatsen uit de Statenvertaling.",
  },
  {
    slug: "heidelbergse-catechismus",
    title: "Heidelbergse Catechismus",
    shortTitle: "Catechismus",
    group: "belijdenis",
    author: "Zacharias Ursinus en Caspar Olevianus",
    year: "1563",
    description:
      "Opgesteld in Heidelberg en verdeeld over 52 zondagen, zodat de hele leer in één jaar aan de orde komt. 129 vragen en antwoorden over ellende, verlossing en dankbaarheid.",
    seoDescription:
      "De Heidelbergse Catechismus online lezen: 52 zondagen, 129 vragen en antwoorden, met de bewijsteksten uit de Statenvertaling.",
  },
  {
    slug: "dordtse-leerregels",
    title: "Dordtse Leerregels",
    shortTitle: "Leerregels",
    group: "belijdenis",
    author: null,
    year: "1618–1619",
    description:
      "Het antwoord van de Synode van Dordrecht op de remonstranten, over verkiezing, verzoening, bekering en de volharding der heiligen. Elk hoofdstuk wordt gevolgd door de verwerping der dwalingen.",
    seoDescription:
      "De Dordtse Leerregels (Synode van Dordrecht, 1618–1619) online lezen: alle hoofdstukken met de verwerping der dwalingen en het besluit.",
  },
  {
    slug: "kort-begrip",
    title: "Kort Begrip der christelijke religie",
    shortTitle: "Kort Begrip",
    group: "catechese",
    author: "Hermannus Faukelius",
    year: "1608",
    description:
      "Een verkorte weergave van de Heidelbergse Catechismus, bedoeld voor wie zich voorbereidt op het heilig avondmaal. De Synode van Dordrecht nam het op onder de boeken voor het kerkelijk onderwijs.",
    seoDescription:
      "Het Kort Begrip der christelijke religie (Hermannus Faukelius, 1608) online lezen, met de Schriftplaatsen uit de Statenvertaling.",
  },
  {
    slug: "hellenbroek",
    title: "Voorbeeld der Goddelijke Waarheden",
    shortTitle: "Hellenbroek",
    group: "catechese",
    author: "Abraham Hellenbroek",
    year: "1706",
    description:
      "Het catechisatieboekje van ds. Abraham Hellenbroek, predikant te Rotterdam, voor wie zich voorbereidt op de openbare belijdenis. Ruim zeshonderd korte vragen en antwoorden in twintig hoofdstukken, hier met de bewijsteksten voluit uit de Statenvertaling.",
    seoDescription:
      "Hellenbroek, Voorbeeld der Goddelijke Waarheden (1706), online lezen per hoofdstuk, met alle bewijsteksten voluit uit de Statenvertaling.",
  },
  {
    slug: "ledeboer",
    title: "Klein vragenboekje voor kinderen",
    shortTitle: "Ledeboer",
    group: "catechese",
    author: "L.G.C. Ledeboer",
    year: "1860",
    description:
      "Eenvoudige vragen en antwoorden van ds. L.G.C. Ledeboer (1808–1863), met bij de antwoorden een tekst uit de Schrift. Van oudsher gebruikt bij het onderwijs aan kinderen.",
    seoDescription:
      "Het Klein vragenboekje voor kinderen van ds. L.G.C. Ledeboer online lezen: 97 vragen en antwoorden, met de Schriftplaatsen voluit uit de Statenvertaling.",
  },
  {
    slug: "liturgische-formulieren",
    title: "Liturgische formulieren",
    shortTitle: "Formulieren",
    group: "liturgie",
    author: null,
    year: "16e–17e eeuw",
    description:
      "De formulieren voor de heilige doop, het heilig avondmaal, de bevestiging van ambtsdragers, het huwelijk en de kerkelijke tucht, zoals de gereformeerde kerken ze sinds de Reformatie gebruiken.",
    seoDescription:
      "De klassieke liturgische formulieren online lezen: doop, heilig avondmaal, bevestiging van ambtsdragers, huwelijk, afsnijding en wederopneming.",
  },
  {
    slug: "christelijke-gebeden",
    title: "Christelijke gebeden",
    shortTitle: "Gebeden",
    group: "liturgie",
    author: null,
    year: "16e–17e eeuw",
    description:
      "De gebeden die van oudsher achter in het psalmboek staan: voor en na de prediking, 's morgens en 's avonds, en voor en na de maaltijd.",
    seoDescription:
      "De christelijke gebeden uit het psalmboek online lezen: morgengebed, avondgebed, gebeden voor en na de maaltijd en bij de prediking.",
  },
  {
    slug: "ziekentroost",
    title: "Ziekentroost",
    shortTitle: "Ziekentroost",
    group: "liturgie",
    author: "Cornelis van Hille",
    year: "1571",
    description:
      "Onderwijs des geloofs en des wegs der zaligheid, om gewillig te sterven. Van oudsher achter in het psalmboek opgenomen, als onderwijs en troost voor zieken en stervenden.",
    seoDescription:
      "De Ziekentroost (Cornelis van Hille, 1571) online lezen: onderwijs en troost uit de Schrift voor zieken en stervenden.",
  },
];

const BY_SLUG = new Map(BRONNEN.map(meta => [meta.slug, meta]));

export function getBronMeta(slug: string): BronMeta | undefined {
  return BY_SLUG.get(slug);
}

export const BRONNEN_PATH = "/bronnen";

export function workPath(slug: string): string {
  return `${BRONNEN_PATH}/${slug}`;
}

export function sectionPath(slug: string, sectionId: string): string {
  return `${BRONNEN_PATH}/${slug}/${sectionId}`;
}
