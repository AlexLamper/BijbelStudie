import {
  SITEMAP_SECTIONS,
  sectionLastModified,
  sectionSitemapUrl,
} from "../../lib/seo/sitemapSections";
import { sitemapIndexXml, SITEMAP_HEADERS } from "../../lib/seo/sitemapXml";

/**
 * /sitemap.xml - the sitemap index. It lists one sitemap per route family
 * (lib/seo/sitemapSections.ts), each served by app/sitemaps/[section].
 *
 * This is a route handler and not Next's app/sitemap.ts convention, because
 * that convention can only return a <urlset>. The URL is unchanged, so
 * app/robots.ts and the Search Console submission keep pointing at the right
 * place; Google re-reads the index and picks up the sections by itself.
 */

export const dynamic = "force-static";

export function GET() {
  const body = sitemapIndexXml(
    SITEMAP_SECTIONS.map(section => ({
      url: sectionSitemapUrl(section),
      lastModified: sectionLastModified(section),
      label: section.label,
    }))
  );
  return new Response(body, { headers: SITEMAP_HEADERS });
}
