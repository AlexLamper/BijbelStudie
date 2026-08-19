import { MetadataRoute } from "next";
import { BASE_URL } from "../lib/pageMetadata";
import { LIBRARY } from "./hulpbronnen/library";

/**
 * Only publicly reachable, indexable Dutch routes belong here. Anything behind
 * auth (middleware.ts protectedRoutes) or marked indexable:false in
 * lib/pageMetadata.ts must stay out - listing a redirecting or blocked URL
 * costs crawl budget and gets flagged in Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                     lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/studies`,              lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/hulpbronnen`,          lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/abonnement`,           lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/help`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`,              lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacybeleid`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/algemene-voorwaarden`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Free library items render their full text to anonymous visitors, so they are
  // real indexable content. Pro items only show a paywalled preview - excluded.
  const libraryRoutes: MetadataRoute.Sitemap = LIBRARY
    .filter(item => !item.isPro)
    .map(item => ({
      url: `${BASE_URL}/hulpbronnen/${item.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...libraryRoutes];
}
