import { MetadataRoute } from "next";
import { BASE_URL } from "../lib/seo/constants";
import { LIBRARY } from "./hulpbronnen/library";
import { GUIDES } from "../lib/content/guides";
import { BIBLE_BOOKS } from "../lib/content/bibleBooks";

/**
 * Only publicly reachable, indexable Dutch routes belong here. Anything behind
 * auth (middleware.ts protectedRoutes) or marked indexable:false in
 * lib/pageMetadata.ts must stay out - listing a redirecting or blocked URL
 * costs crawl budget and gets flagged in Search Console as "Pagina met
 * omleiding". tests/seo.test.ts enforces both rules.
 *
 * On lastModified: content pages carry the date they were actually written.
 * Stamping `new Date()` on everything at build time tells Google the entire
 * site changed on every deploy, which is exactly how a site teaches Google to
 * stop trusting its lastmod values.
 */

/** Bumped by hand when the marketing pages materially change. */
const SITE_CONTENT_DATE = new Date("2026-08-21");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                     lastModified: SITE_CONTENT_DATE, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/bijbelstudie`,         lastModified: SITE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/bijbelboeken`,         lastModified: SITE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/studies`,              lastModified: SITE_CONTENT_DATE, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/hulpbronnen`,          lastModified: SITE_CONTENT_DATE, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/abonnement`,           lastModified: SITE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/help`,                 lastModified: SITE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`,              lastModified: SITE_CONTENT_DATE, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/privacybeleid`,        lastModified: SITE_CONTENT_DATE, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/algemene-voorwaarden`, lastModified: SITE_CONTENT_DATE, changeFrequency: "yearly",  priority: 0.2 },
  ];

  // The hub is already in staticRoutes above; only the sub-guides go here.
  const guideRoutes: MetadataRoute.Sitemap = GUIDES
    .filter(guide => guide.slug !== "")
    .map(guide => ({
      url: `${BASE_URL}${guide.path}`,
      lastModified: new Date(guide.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const bibleBookRoutes: MetadataRoute.Sitemap = BIBLE_BOOKS.map(book => ({
    url: `${BASE_URL}/bijbelboeken/${book.slug}`,
    lastModified: SITE_CONTENT_DATE,
    changeFrequency: "yearly" as const,
    // Genesis, Psalmen, Johannes and Openbaring get searched far more than
    // Obadja; nudging the long tail down keeps the crawler on the pages that
    // can actually win a query.
    priority: book.chapters >= 20 ? 0.7 : 0.6,
  }));

  // Free library items render their full text to anonymous visitors, so they are
  // real indexable content. Pro items only show a paywalled preview - excluded.
  const libraryRoutes: MetadataRoute.Sitemap = LIBRARY
    .filter(item => !item.isPro)
    .map(item => ({
      url: `${BASE_URL}/hulpbronnen/${item.slug}`,
      lastModified: SITE_CONTENT_DATE,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));

  return [
    ...staticRoutes,
    ...guideRoutes,
    ...bibleBookRoutes,
    ...libraryRoutes,
  ];
}
