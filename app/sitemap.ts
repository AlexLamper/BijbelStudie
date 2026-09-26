import { MetadataRoute } from "next";
import { BASE_URL } from "../lib/seo/constants";
import { GUIDE_HUB, GUIDES } from "../lib/content/guides";
import { BIBLE_BOOKS } from "../lib/content/bibleBooks";
import { curatedStudies } from "../lib/data/curated-studies";
import { chapterSitemapEntries } from "../lib/chapterPages";
import { topicSitemapEntries } from "../lib/content/topics";

/**
 * Only publicly reachable, indexable Dutch routes belong here. Anything behind
 * auth (middleware.ts protectedRoutes), marked indexable:false in
 * lib/pageMetadata.ts, or redirected in next.config.ts must stay out - listing
 * a redirecting or blocked URL costs crawl budget and gets flagged in Search
 * Console as "Pagina met omleiding". tests/seo.test.ts enforces all three.
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

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: keyof typeof PAGE_DATES,
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>,
    priority: number
  ) => ({ url: `${BASE_URL}${path}`, lastModified: day(PAGE_DATES[path]), changeFrequency, priority });

  const staticRoutes: MetadataRoute.Sitemap = [
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

  // The hub and the sub-guides carry their own dateModified, the same value
  // their Article structured data states - two different dates for one page
  // would be a contradiction Google has to resolve.
  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map(guide => ({
    url: `${BASE_URL}${guide.path}`,
    lastModified: day(guide.dateModified),
    changeFrequency: "monthly" as const,
    priority: guide === GUIDE_HUB ? 0.9 : 0.8,
  }));

  // Each curated study has its own public detail page with hand-authored
  // description, outcomes and lesson list. The generated book studies
  // (/studies/boek-<slug>) are noindex and are not in curatedStudies.
  const studyRoutes: MetadataRoute.Sitemap = curatedStudies.map(study => ({
    url: `${BASE_URL}/studies/${study.id}`,
    lastModified: day(STUDY_PAGES_DATE),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const bibleBookRoutes: MetadataRoute.Sitemap = [
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

  // New route families get their own list above and one line here, each with
  // its own honest dates.
  return [
    ...staticRoutes,
    ...guideRoutes,
    ...studyRoutes,
    ...bibleBookRoutes,
    // Every chapter, /bijbel/<boek>/<n> (1189 URLs). Dates and priority are
    // set in lib/chapterPages.ts, which reads no data files.
    ...chapterSitemapEntries(BASE_URL),
    // "Wat zegt de Bijbel over ..." - the hub and every topic page.
    ...topicSitemapEntries(BASE_URL),
  ];
}
