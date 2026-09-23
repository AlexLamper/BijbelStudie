import type { MetadataRoute } from "next";
import { getBibleBook, readerHref } from "../bibleBooks";
import type { Topic, TopicGroup, TopicPassage } from "./types";
import { TOPIC_ANGST } from "./angst";
import { TOPIC_VERGEVING } from "./vergeving";
import { TOPIC_GEBED } from "./gebed";
import { TOPIC_LIEFDE } from "./liefde";
import { TOPIC_HOOP } from "./hoop";
import { TOPIC_GELOOF } from "./geloof";
import { TOPIC_GENADE } from "./genade";
import { TOPIC_ROUW } from "./rouw";
import { TOPIC_ZORGEN } from "./zorgen";
import { TOPIC_VREDE } from "./vrede";
import { TOPIC_DANKBAARHEID } from "./dankbaarheid";
import { TOPIC_TWIJFEL } from "./twijfel";
import { TOPIC_VRIENDSCHAP } from "./vriendschap";
import { TOPIC_EEUWIG_LEVEN } from "./eeuwig-leven";

export type { Topic, TopicGroup, TopicPassage, TopicSection, TopicPoint } from "./types";

/** Route of the hub; every topic lives one segment below it. */
export const TOPICS_PATH = "/bijbel-over";

/** Every topic page, in the order they were planned. The hub groups them. */
export const TOPICS: Topic[] = [
  TOPIC_ANGST,
  TOPIC_VERGEVING,
  TOPIC_GEBED,
  TOPIC_LIEFDE,
  TOPIC_HOOP,
  TOPIC_GELOOF,
  TOPIC_GENADE,
  TOPIC_ROUW,
  TOPIC_ZORGEN,
  TOPIC_VREDE,
  TOPIC_DANKBAARHEID,
  TOPIC_TWIJFEL,
  TOPIC_VRIENDSCHAP,
  TOPIC_EEUWIG_LEVEN,
];

const BY_SLUG = new Map(TOPICS.map(t => [t.slug, t]));

export function getTopic(slug: string): Topic | undefined {
  return BY_SLUG.get(slug);
}

export function topicPath(topic: Topic): string {
  return `${TOPICS_PATH}/${topic.slug}`;
}

/**
 * Topics whose passages cite this book - and, when given, this chapter - in
 * list order. Lets the book and chapter pages link the topic pages that read
 * them, so those links follow from the content instead of a hand-kept map.
 */
export function topicsCiting(bookSlug: string, chapter?: number): Topic[] {
  return TOPICS.filter(topic =>
    topic.sections.some(section =>
      (section.passages ?? []).some(
        passage => passage.book === bookSlug && (chapter === undefined || passage.chapter === chapter)
      )
    )
  );
}

/** H1, <title> and Article headline: the question exactly as it is searched. */
export function topicHeading(topic: Topic): string {
  return `Wat zegt de Bijbel over ${topic.subject}?`;
}

/** Hub sections, in display order. */
export const TOPIC_GROUPS: { id: TopicGroup; label: string; description: string }[] = [
  {
    id: "god-en-geloof",
    label: "God en geloof",
    description: "Wie God is, hoe Hij vergeeft, en wat het betekent Hem te vertrouwen.",
  },
  {
    id: "moeilijke-tijden",
    label: "Moeilijke tijden",
    description: "Wat de Bijbel zegt tegen wie bang is, piekert, rouwt of houvast zoekt.",
  },
  {
    id: "leven-uit-geloof",
    label: "Leven uit geloof",
    description: "Liefde, vrede, dankbaarheid en vriendschap in het dagelijks leven.",
  },
];

export function topicsInGroup(group: TopicGroup): Topic[] {
  return TOPICS.filter(t => t.group === group);
}

/** The hub page's own copy and dates. */
export const TOPIC_HUB = {
  path: TOPICS_PATH,
  /** Crumb label. Reads as the start of every topic's question. */
  crumb: "Wat zegt de Bijbel over",
  h1: "Wat zegt de Bijbel?",
  /** Without the "BijbelStudie | " prefix buildMetadata adds. */
  title: "Wat zegt de Bijbel? Onderwerpen uitgelegd",
  description:
    "Wat zegt de Bijbel over angst, vergeving, gebed, rouw of twijfel? Per onderwerp de belangrijkste teksten uit het Oude en Nieuwe Testament, uitgelegd.",
  intro: [
    "Wat de Bijbel over een onderwerp zegt, haal je niet uit één losse tekst. Per onderwerp zetten we de belangrijkste gedeelten uit het Oude en het Nieuwe Testament op een rij, lezen we ze in hun context en laten we zien wat ze betekenen - en wat niet.",
    "Elke pagina begint met een kort antwoord, loopt dan de teksten door en eindigt met misverstanden, praktische stappen en veelgestelde vragen.",
  ],
  principles: [
    {
      title: "De hele Bijbel",
      text: "Elk onderwerp begint in het Oude Testament en loopt door in het Nieuwe. Een tekst wordt pas helder als je ziet waar hij in het geheel staat.",
    },
    {
      title: "Lezen in context",
      text: "Bij elke tekst staat wie er spreekt, tegen wie en in welke situatie. Bekende verzen als Jeremia 29:11 of 1 Corinthiërs 13 lezen anders als je dat weet.",
    },
    {
      title: "Eerlijk over wat er staat",
      text: "Waar uitleggers verschillen of de tekst iets niet zegt, zeggen we dat ook. Wat niet in de Bijbel staat, brengen we niet als feit.",
    },
    {
      title: "Citaten uit de Statenvertaling",
      text: "Korte citaten komen uit de Statenvertaling. Bij elke tekst staat de verwijzing, zodat je hem ook in je eigen vertaling kunt nalezen.",
    },
    {
      title: "Geen vervanging voor hulp",
      text: "Bij onderwerpen als angst en rouw wijzen we ook de weg naar hulp. Een webpagina vervangt geen predikant, huisarts of goede vriend.",
    },
  ],
  datePublished: "2026-09-23",
  /** The hub lists every topic, so it changes whenever one is added or renamed. */
  dateModified: "2026-09-23",
} as const;

/* ─── Passages ─────────────────────────────────────────────────── */

/**
 * "Psalm 23:4", "1 Johannes 4:18", "Psalm 88". Built from the book's display
 * name so the spelling always matches /bijbelboeken; a single psalm reads
 * "Psalm", not "Psalmen".
 */
export function passageRef(p: TopicPassage): string {
  if (p.ref) return p.ref;
  const book = getBibleBook(p.book);
  const name = p.book === "psalmen" ? "Psalm" : book?.name ?? p.book;
  return p.verses ? `${name} ${p.chapter}:${p.verses}` : `${name} ${p.chapter}`;
}

/** The chapter in the reader (Statenvertaling), so the passage can be read in full. */
export function passageReaderHref(p: TopicPassage): string | null {
  const book = getBibleBook(p.book);
  return book ? readerHref(book, p.chapter) : null;
}

/* ─── Size ─────────────────────────────────────────────────────── */

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Words of article text a reader sees: heading, answer, sections, passages,
 * misunderstandings, practice, care note and FAQs. Navigation, related links
 * and the call to action are left out. Feeds the Article `wordCount` and the
 * reading time.
 */
export function topicWordCount(topic: Topic): number {
  const parts: string[] = [topicHeading(topic), topic.answer];
  for (const section of topic.sections) {
    parts.push(section.heading, ...section.body);
    for (const p of section.passages ?? []) {
      parts.push(passageRef(p), p.quote ?? "", p.text);
    }
  }
  for (const point of [...topic.misunderstandings, ...topic.practice]) {
    parts.push(point.title, point.text);
  }
  parts.push(topic.practiceHeading, topic.careNote ?? "");
  for (const faq of topic.faqs) parts.push(faq.q, faq.a);
  return parts.reduce((sum, part) => sum + words(part), 0);
}

/** Minutes at ~200 words a minute, never less than one. */
export function topicReadingMinutes(topic: Topic): number {
  return Math.max(1, Math.round(topicWordCount(topic) / 200));
}

/* ─── Sitemap ──────────────────────────────────────────────────── */

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Sitemap entries for the hub and every topic, each with the date its own text
 * last changed (the same date its Article markup states). app/sitemap.ts
 * spreads this into its list.
 */
export function topicSitemapEntries(baseUrl: string): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}${TOPIC_HUB.path}`,
      lastModified: day(TOPIC_HUB.dateModified),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...TOPICS.map(topic => ({
      url: `${baseUrl}${topicPath(topic)}`,
      lastModified: day(topic.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
