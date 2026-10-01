import { SITEMAP_SECTIONS, getSitemapSection } from "../../../lib/seo/sitemapSections";
import { urlsetXml, SITEMAP_HEADERS } from "../../../lib/seo/sitemapXml";

/**
 * /sitemaps/<id>.xml - one route family per file, listed by /sitemap.xml.
 *
 * The ".xml" is part of the dynamic segment rather than a folder, so the
 * section ids in lib/seo/sitemapSections.ts are the single source of these
 * URLs. All of them are prerendered at build time (generateStaticParams +
 * force-static): the entries are pure functions over in-repo content, so
 * generating them per request would spend CPU on an answer that cannot change
 * between deploys.
 */

export const dynamic = "force-static";
/** Anything that is not one of the sections is a 404, not a build-time file. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_SECTIONS.map(section => ({ section: `${section.id}.xml` }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section: segment } = await params;
  const section = segment.endsWith(".xml")
    ? getSitemapSection(segment.slice(0, -".xml".length))
    : undefined;
  if (!section) return new Response("Not found", { status: 404 });
  return new Response(urlsetXml(section.entries()), { headers: SITEMAP_HEADERS });
}
