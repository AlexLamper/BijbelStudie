import type { MetadataRoute } from "next";
import { BASE_URL } from "./constants";
import { GUIDE_HUB, GUIDES } from "../content/guides";
import { BIBLE_BOOKS } from "../content/bibleBooks";
import { curatedStudies } from "../data/curated-studies";
import { chapterSitemapEntries } from "../chapterPages";
import { topicSitemapEntries } from "../content/topics";
import { bronnenSitemapEntries } from "../content/bronnen/published";

/**
 * The sitemap, split per route family. `/sitemap.xml` is a sitemap index that
 * points at one `/sitemaps/<id>.xml` per section below.
 *
 * Why split: Search Console reports coverage PER SITEMAP. One flat file of
 * 1457 URLs gives one number, in which 1189 chapter pages drown out the 14
 * topic pages - "412 van 1457 geindexeerd" says nothing about which families
 * Google accepts and which it parks on "Gevonden - momenteel niet
 * geindexeerd". Per section the answer is immediate. The split changes no
 * ranking signal; it is a diagnostic, and the URLs, dates and priorities are
 * exactly the ones the single flat file carried.
 *
 * Only publicly reachable, indexable Dutch routes belong here. Anything behind
 * auth (middleware.ts protectedRoutes), marked indexable:false in
 * lib/pageMetadata.ts, or redirected in next.config.ts must stay out - listing
 * a redirecting or blocked URL costs crawl budget and gets flagged in Search
 * Console as "Pagina met omleiding". tests/seo.test.ts enforces all three
 * against the concatenation of every section.
 *
 * On lastModified: every page carries the date its content last materially
 * changed - copy, sections, the facts on it - not the date of the deploy that
 * happened to rebuild it. Stamping `new Date()` on everything tells Google the
 * whole site changed on every deploy, which is exactly how a site teaches
 * Google to ignore its lastmod values. Honest dates are the one sitemap signal
 * Google does use (it ignores priority and changefreq), and they are what
 * decides which "Gevonden - momenteel niet geindexeerd" URL it fetches first.
 * `npm run indexnow -- --since <date>` reads the same dates.
 *
 * So: when you change a page's content, bump ITS date below and nothing else.
 */

/** Per-page content dates (YYYY-MM-DD), keyed by path. */
const PAGE_DATES = {
  // Landing copy and sections: links into the guides, the book pages and
  // every authored study (2026-09-23), shorter description the same day.
  "/":                     "2026-09-23",
  "/studies":              "2026-09-23",
  // Bijbel in een jaar: explanation and the first days of the schedule.
  "/studies/bijbel-in-een-jaar": "2026-09-26",
  "/abonnement":           "2026-09-20",
  // The FAQ text itself lives in lib/content/helpFaq.ts.
  "/help":                 "2026-09-23",
  "/beoordelingen":        "2026-09-22",
  "/contact":              "2026-09-23",
  // Google Analytics named as processor, cookie settings added.
  "/privacybeleid":        "2026-09-23",
  "/algemene-voorwaarden": "2026-08-21",
  "/account-verwijderen":  "2026-09-16",
} as const;

/**
 * The authored study pages (/studies/<id>): about, outcomes and the "Meer
 * studies" card were written for all of them on this date. Bump it when the
 * study copy in lib/data/curated-studies.ts or the detail page changes.
 */
const STUDY_PAGES_DATE = "2026-09-23";

/**
 * /bijbelboeken and the 66 book pages, whose text lives in
 * lib/content/bibleBooks. Rewritten on this date.
 */
const BIBLE_BOOKS_DATE = "2026-09-23";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

const page = (
  path: keyof typeof PAGE_DATES,
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>,
  priority: number
) => ({ url: `${BASE_URL}${path}`, lastModified: day(PAGE_DATES[path]), changeFrequency, priority });

function staticRoutes(): MetadataRoute.Sitemap {
  return [
    page("/",                     "weekly",  1.0),
    page("/studies",              "weekly",  0.8),
    page("/studies/bijbel-in-een-jaar", "monthly", 0.8),
    page("/abonnement",           "monthly", 0.7),
    page("/help",                 "monthly", 0.6),
    // Its content is the review wall itself, which changes whenever a reader
    // leaves a rating - hence "weekly".
    page("/beoordelingen",        "weekly",  0.5),
    page("/contact",              "yearly",  0.4),
    page("/privacybeleid",        "yearly",  0.2),
    page("/algemene-voorwaarden", "yearly",  0.2),
    page("/account-verwijderen",  "yearly",  0.2),
  ];
}

// The hub and the sub-guides carry their own dateModified, the same value
// their Article structured data states - two different dates for one page
// would be a contradiction Google has to resolve.
function guideRoutes(): MetadataRoute.Sitemap {
  return GUIDES.map(guide => ({
    url: `${BASE_URL}${guide.path}`,
    lastModified: day(guide.dateModified),
    changeFrequency: "monthly" as const,
    priority: guide === GUIDE_HUB ? 0.9 : 0.8,
  }));
}

// Each curated study has its own public detail page with hand-authored
// description, outcomes and lesson list. The generated book studies
// (/studies/boek-<slug>) are noindex and are not in curatedStudies.
function studyRoutes(): MetadataRoute.Sitemap {
  return curatedStudies.map(study => ({
    url: `${BASE_URL}/studies/${study.id}`,
    lastModified: day(STUDY_PAGES_DATE),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
}

function bibleBookRoutes(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/bijbelboeken`,
      lastModified: day(BIBLE_BOOKS_DATE),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    ...BIBLE_BOOKS.map(book => ({
      url: `${BASE_URL}/bijbelboeken/${book.slug}`,
      lastModified: day(BIBLE_BOOKS_DATE),
      changeFrequency: "yearly" as const,
      // Genesis, Psalmen, Johannes and Openbaring get searched far more than
      // Obadja; nudging the long tail down keeps the crawler on the pages that
      // can actually win a query.
      priority: book.chapters >= 20 ? 0.7 : 0.6,
    })),
  ];
}

export type SitemapSection = {
  /**
   * URL id: the section is served at /sitemaps/<id>.xml. Never rename one -
   * Search Console tracks a sitemap by its URL, so a rename throws away that
   * section's coverage history and starts it over at zero.
   */
  id: string;
  /** What the section holds; shown in the index and by the scripts. */
  label: string;
  entries: () => MetadataRoute.Sitemap;
};

/**
 * One section per route family. A new family gets its own builder above and
 * one line here; nothing else needs touching - the index, the per-section
 * route, the tests, indexnow and gsc-inspect all read this list.
 */
export const SITEMAP_SECTIONS: readonly SitemapSection[] = [
  { id: "paginas",      label: "Vaste pagina's",               entries: staticRoutes },
  { id: "bijbelstudie", label: "Gidsen (/bijbelstudie)",       entries: guideRoutes },
  { id: "studies",      label: "Studies (/studies)",           entries: studyRoutes },
  { id: "bijbelboeken", label: "Bijbelboeken (/bijbelboeken)", entries: bibleBookRoutes },
  { id: "bijbel-over",  label: "Onderwerpen (/bijbel-over)",   entries: () => topicSitemapEntries(BASE_URL) },
  // Bronnen: the confessions, forms and catechism booklets. Dates in
  // lib/content/bronnen/published.ts; a work without a data file is absent.
  { id: "bronnen",      label: "Bronnen (/bronnen)",           entries: () => bronnenSitemapEntries(BASE_URL) },
  // Every chapter, /bijbel/<boek>/<n> (1189 URLs). Dates and priority are set
  // in lib/chapterPages.ts, which reads no data files.
  { id: "bijbel",       label: "Bijbelkapittels (/bijbel)",    entries: () => chapterSitemapEntries(BASE_URL) },
];

export function getSitemapSection(id: string): SitemapSection | undefined {
  return SITEMAP_SECTIONS.find(section => section.id === id);
}

/** The URL a section is served at. */
export function sectionSitemapUrl(section: SitemapSection): string {
  return `${BASE_URL}/sitemaps/${section.id}.xml`;
}

/**
 * Every URL in every section, in section order - exactly what the old flat
 * /sitemap.xml returned. The tests assert their rules against this.
 */
export function allSitemapEntries(): MetadataRoute.Sitemap {
  return SITEMAP_SECTIONS.flatMap(section => section.entries());
}

/** The newest lastModified in a section, for its <lastmod> in the index. */
export function sectionLastModified(section: SitemapSection): Date | null {
  const times = section.entries().map(entry => new Date(entry.lastModified as Date).getTime());
  return times.length === 0 ? null : new Date(Math.max(...times));
}
