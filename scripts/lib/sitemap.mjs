/**
 * Reading the live sitemap, which is a sitemap INDEX: /sitemap.xml lists one
 * /sitemaps/<section>.xml per route family (lib/seo/sitemapSections.ts). A
 * script that greps <loc> out of /sitemap.xml alone gets the seven section
 * files instead of the 1457 pages, so every script that walks the site goes
 * through here.
 *
 * Plain <urlset> at /sitemap.xml is still handled, so this keeps working
 * against an older deploy or a preview built before the split.
 */

const BLOCK = /<(url|sitemap)\b[^>]*>([\s\S]*?)<\/\1>/g;
const TAG = tag => new RegExp(`<${tag}>([^<]+)</${tag}>`);

function parse(xml) {
  const isIndex = /<sitemapindex\b/.test(xml);
  const entries = [...xml.matchAll(BLOCK)].map(match => ({
    loc: match[2].match(TAG("loc"))?.[1]?.trim(),
    lastmod: match[2].match(TAG("lastmod"))?.[1]?.trim() ?? null,
  })).filter(entry => entry.loc);
  return { isIndex, entries };
}

async function fetchXml(url, onError) {
  const res = await fetch(url);
  if (!res.ok) onError(`${url} gaf HTTP ${res.status}`);
  return res.text();
}

/**
 * Every page in the sitemap, as { loc, lastmod, sitemap }, where `sitemap` is
 * the section file it came from (null when the site still serves one flat
 * sitemap). Section files are fetched in parallel - there are seven of them.
 */
export async function sitemapPages(base, onError = message => { throw new Error(message); }) {
  const root = `${base}/sitemap.xml`;
  const { isIndex, entries } = parse(await fetchXml(root, onError));
  if (!isIndex) return entries.map(entry => ({ ...entry, sitemap: null }));
  if (entries.length === 0) onError(`${root} is een sitemapindex zonder sitemaps`);
  const sections = await Promise.all(
    entries.map(async section => {
      const { entries: pages } = parse(await fetchXml(section.loc, onError));
      return pages.map(page => ({ ...page, sitemap: section.loc }));
    })
  );
  return sections.flat();
}

/** Just the URLs, for callers that do not care where each one came from. */
export async function sitemapUrls(base, onError) {
  return (await sitemapPages(base, onError)).map(page => page.loc);
}

/** The section files themselves, for reporting per sitemap. */
export async function sitemapSections(base, onError = message => { throw new Error(message); }) {
  const { isIndex, entries } = parse(await fetchXml(`${base}/sitemap.xml`, onError));
  return isIndex ? entries.map(entry => entry.loc) : [];
}
