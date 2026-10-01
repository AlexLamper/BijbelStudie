import type { MetadataRoute } from "next";

/**
 * Serialising the sitemap XML by hand, because Next's built-in sitemap
 * convention (app/sitemap.ts) can only emit a <urlset> - it has no way to
 * express a <sitemapindex>, which is what lets Search Console report coverage
 * per route family. See lib/seo/sitemapSections.ts.
 */

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Sitemaps are XML, so a raw "&" in a URL is a parse error and Search Console
 * rejects the whole file. Today every path here is slug-safe, which is exactly
 * why this is easy to forget the day one is not.
 */
function xml(value: string): string {
  return value.replace(/[&<>"']/g, char => XML_ESCAPES[char]);
}

/** W3C datetime, which is the only <lastmod> format Google reads. */
function lastmod(value: Date | string | number): string {
  return new Date(value).toISOString();
}

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

/** A <urlset>: one section's pages. */
export function urlsetXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map(entry => {
    const parts = [`<loc>${xml(entry.url)}</loc>`];
    if (entry.lastModified) parts.push(`<lastmod>${lastmod(entry.lastModified)}</lastmod>`);
    if (entry.changeFrequency) parts.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
    if (entry.priority !== undefined) parts.push(`<priority>${entry.priority}</priority>`);
    return `<url>\n${parts.map(part => `  ${part}`).join("\n")}\n</url>`;
  });
  return `${HEADER}\n<urlset xmlns="${NS}">\n${urls.join("\n")}\n</urlset>\n`;
}

/** A <sitemapindex>: the list of section sitemaps. */
export function sitemapIndexXml(
  sitemaps: { url: string; lastModified?: Date | null; label?: string }[]
): string {
  const items = sitemaps.map(entry => {
    const parts = [`<loc>${xml(entry.url)}</loc>`];
    if (entry.lastModified) parts.push(`<lastmod>${lastmod(entry.lastModified)}</lastmod>`);
    // A comment is legal XML and ignored by crawlers; it is there for whoever
    // opens the index in a browser to work out which file holds what.
    const comment = entry.label ? `<!-- ${xml(entry.label)} -->\n` : "";
    return `${comment}<sitemap>\n${parts.map(part => `  ${part}`).join("\n")}\n</sitemap>`;
  });
  return `${HEADER}\n<sitemapindex xmlns="${NS}">\n${items.join("\n")}\n</sitemapindex>\n`;
}

/**
 * Sitemaps are built from hand-set content dates, so the file only changes
 * when a deploy changes it: cache hard at the edge and let the next deploy
 * invalidate it. Keeps these routes off the per-request CPU budget.
 */
export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
} as const;
