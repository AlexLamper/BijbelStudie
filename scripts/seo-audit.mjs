#!/usr/bin/env node
/**
 * Crawls every URL in the live sitemap the way Googlebot fetches it and lists
 * what Search Console would later complain about. Read-only: plain GETs of
 * public pages, nothing else.
 *
 *   npm run seo-audit                                  www.bijbelstudie.io
 *   npm run seo-audit -- --base https://<preview>.vercel.app
 *   npm run seo-audit -- --targets <Search Console export>.csv
 *
 * Per URL: status and redirects, X-Robots-Tag, meta robots, canonical (must be
 * the URL itself), title and description length, number of <h1>, words of
 * text in the HTML, how many sitemap pages link to it, JSON-LD that does not
 * parse. Site-wide: duplicate titles and descriptions, crawlable pages that
 * are linked but missing from the sitemap, and time to first byte per page
 * type together with whether Vercel served it from the cache (prerendered) or
 * rendered it for this request.
 *
 * --targets takes a Search Console table export (first column the URL, e.g.
 * "Gevonden - momenteel niet geindexeerd") and prints, for each URL in it,
 * whether it is still in the sitemap and which sitemap pages link to it. That
 * is the report to read when Google knows a URL but will not crawl it: a page
 * nothing links to gets the lowest crawl priority there is.
 *
 * Only raw HTML is inspected. Googlebot also renders JavaScript, so a page
 * that fills in client-side can look thinner here than it is - but links
 * behind a button stay invisible to both.
 */

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const argValue = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = (argValue("--base") ?? "https://www.bijbelstudie.io").replace(/\/$/, "");
const TARGETS = argValue("--targets");
const HOST = new URL(BASE).host;
const UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CONCURRENCY = 4;

const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 160;
const THIN_WORDS = 300;
const MIN_INLINKS = 3;

const decode = s =>
  s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1];

async function robotsDisallows() {
  const text = await (await fetch(`${BASE}/robots.txt`)).text();
  const rules = [];
  let applies = false;
  for (const line of text.split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key.trim())) applies = value === "*";
    else if (applies && /^disallow$/i.test(key.trim()) && value) rules.push(value);
  }
  return path =>
    rules.some(rule =>
      rule.endsWith("$") ? path === rule.slice(0, -1) : path.startsWith(rule.replace(/\?$/, ""))
    );
}

async function main() {
  const blocked = await robotsDisallows();
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim().replace(/^https:\/\/www\.bijbelstudie\.io/, BASE));
  const results = [];
  const inlinks = new Map();
  /** target URL -> the sitemap pages that link to it */
  const sources = new Map();
  const linkedNotInSitemap = new Map();

  async function audit(url) {
    const started = Date.now();
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA } });
    const ms = Date.now() - started;
    const html = res.status === 200 ? await res.text() : "";
    const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
    const robots = metas.filter(m => /name="(robots|googlebot)"/i.test(m)).map(m => attr(m, "content")).join(" | ");
    const canonicalTag = links.find(l => /rel="canonical"/i.test(l));
    const description = decode(attr(metas.find(m => /name="description"/i.test(m)) ?? "", "content") ?? "");
    const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
    const body = (html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").split(/<body[^>]*>/i)[1]) ?? "";
    const words = body.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").split(/\s+/).filter(Boolean).length;
    const h1 = (html.match(/<h1\b/gi) ?? []).length;
    const badJsonLd = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].some(m => {
      try { JSON.parse(m[1]); return false; } catch { return true; }
    });

    const own = new Set();
    for (const [, href] of body.matchAll(/<a\b[^>]*href="([^"#]*)"/gi)) {
      let target;
      try { target = new URL(decode(href), url); } catch { continue; }
      if (target.host !== HOST) continue;
      const clean = `${BASE}${target.pathname.replace(/\/$/, "") || "/"}`;
      if (clean !== url) own.add(clean);
    }
    for (const target of own) {
      inlinks.set(target, (inlinks.get(target) ?? 0) + 1);
      if (!sources.has(target)) sources.set(target, []);
      sources.get(target).push(url.slice(BASE.length) || "/");
      const path = new URL(target).pathname;
      if (!urls.includes(target) && !blocked(path) && !/\.[a-z0-9]+$/i.test(path)) {
        linkedNotInSitemap.set(target, (linkedNotInSitemap.get(target) ?? 0) + 1);
      }
    }

    results.push({
      url, status: res.status, location: res.headers.get("location"), xRobots: res.headers.get("x-robots-tag"),
      ms, robots, canonical: canonicalTag ? attr(canonicalTag, "href") : null, title, description, h1, words, badJsonLd,
      // HIT / STALE / PRERENDER = served from Vercel's cache; MISS together
      // with `private, no-store` = rendered in a function for this request.
      cache: res.headers.get("x-vercel-cache") ?? "-",
      dynamic: /no-store|private/i.test(res.headers.get("cache-control") ?? ""),
    });
  }

  const queue = [...urls];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try { await audit(url); } catch (error) { results.push({ url, status: `ERR ${error.message}` }); }
    }
  }));
  results.sort((a, b) => urls.indexOf(a.url) - urls.indexOf(b.url));

  const sameUrl = (a, b) => a?.replace(/\/$/, "") === b?.replace(/\/$/, "");
  const issues = [];
  for (const r of results) {
    const path = r.url.slice(BASE.length) || "/";
    const flags = [];
    if (r.status !== 200) flags.push(`status ${r.status}${r.location ? ` -> ${r.location}` : ""}`);
    if (r.xRobots) flags.push(`X-Robots-Tag: ${r.xRobots}`);
    if (/noindex/i.test(r.robots ?? "")) flags.push(`noindex (${r.robots})`);
    if (r.status === 200) {
      if (!sameUrl(r.canonical?.replace(/^https:\/\/www\.bijbelstudie\.io/, BASE), r.url)) flags.push(`canonical ${r.canonical}`);
      if (r.title.length > TITLE_MAX) flags.push(`title ${r.title.length} tekens`);
      if (r.description.length < DESC_MIN || r.description.length > DESC_MAX) flags.push(`description ${r.description.length} tekens`);
      if (r.h1 !== 1) flags.push(`${r.h1}x h1`);
      if (r.words < THIN_WORDS) flags.push(`${r.words} woorden`);
      if (r.badJsonLd) flags.push("JSON-LD parse error");
      if (r.ms > 2500) flags.push(`${r.ms} ms`);
    }
    const links = inlinks.get(r.url) ?? 0;
    if (path !== "/" && links < MIN_INLINKS) flags.push(`${links} interne links`);
    if (flags.length) issues.push(`  ${path}: ${flags.join("; ")}`);
  }

  const duplicates = key => Object.entries(
    results.reduce((acc, r) => { if (r[key]) (acc[r[key]] ??= []).push(r.url.slice(BASE.length) || "/"); return acc; }, {})
  ).filter(([, pages]) => pages.length > 1);

  const ok = results.filter(r => r.status === 200).length;
  const times = results.map(r => r.ms ?? 0).sort((a, b) => a - b);
  console.log(`${BASE}: ${urls.length} URLs in sitemap, ${ok} x 200, mediaan ${times[Math.floor(times.length / 2)]} ms\n`);
  console.log(issues.length ? `Aandachtspunten (${issues.length}):\n${issues.join("\n")}` : "Geen aandachtspunten.");
  for (const [label, key] of [["Dubbele titels", "title"], ["Dubbele descriptions", "description"]]) {
    const dups = duplicates(key);
    if (dups.length) console.log(`\n${label}:\n${dups.map(([text, pages]) => `  "${text.slice(0, 70)}": ${pages.join(", ")}`).join("\n")}`);
  }
  if (linkedNotInSitemap.size) {
    console.log(`\nGelinkt en crawlbaar, maar niet in de sitemap (noindex-pagina's horen hier ook bij):`);
    for (const [url, count] of [...linkedNotInSitemap].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
      console.log(`  ${count}x ${url.slice(BASE.length)}`);
    }
  }

  // Grouped by route rather than by URL: every page of one route shares its
  // rendering mode, so one slow group is one fix.
  const groups = new Map();
  for (const r of results.filter(r => r.status === 200)) {
    const segments = new URL(r.url).pathname.split("/").filter(Boolean);
    const key = segments.length === 0 ? "/" : segments.length === 1 ? `/${segments[0]}` : `/${segments[0]}/[..]`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  console.log(`\nTijd tot eerste byte per paginatype (mediaan / max, cache, gerenderd):`);
  for (const [key, rows] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ms = rows.map(r => r.ms).sort((a, b) => a - b);
    const caches = [...new Set(rows.map(r => r.cache))].join("/");
    const dynamicCount = rows.filter(r => r.dynamic).length;
    const mode = dynamicCount === 0 ? "statisch" : dynamicCount === rows.length ? "per request" : `${dynamicCount}/${rows.length} per request`;
    console.log(`  ${key.padEnd(24)} ${String(rows.length).padStart(3)}x  ${String(ms[Math.floor(ms.length / 2)]).padStart(5)} / ${String(ms[ms.length - 1]).padStart(5)} ms  ${caches.padEnd(10)} ${mode}`);
  }

  if (TARGETS) {
    const inSitemap = new Set(urls);
    const targets = readFileSync(TARGETS, "utf8")
      .split(/\r?\n/)
      .map(line => line.split(",")[0].trim().replace(/^"|"$/g, ""))
      .filter(cell => /^https?:\/\//.test(cell))
      .map(cell => cell.replace(/^https:\/\/www\.bijbelstudie\.io/, BASE).replace(/\/$/, ""));
    console.log(`\nInterne links naar ${targets.length} URL's uit ${TARGETS} (bron: sitemap-pagina's):`);
    for (const target of targets) {
      const from = sources.get(target) ?? [];
      const listed = inSitemap.has(target) ? "" : "  [niet in sitemap]";
      const shown = from.length > 6 ? `${from.slice(0, 6).join(", ")}, +${from.length - 6}` : from.join(", ");
      console.log(`  ${String(from.length).padStart(3)}  ${target.slice(BASE.length)}${listed}${from.length ? `  <- ${shown}` : ""}`);
    }
  }
  if (results.some(r => r.status !== 200)) process.exitCode = 1;
}

main().catch(error => {
  console.error(`seo-audit: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
