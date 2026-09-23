#!/usr/bin/env node
/**
 * IndexNow: tell Bing - and through Bing's index DuckDuckGo, Yahoo, Ecosia and
 * Copilot, plus Yandex, Seznam and Naver - which URLs changed, so they recrawl
 * within minutes instead of whenever. Google does not take part in IndexNow;
 * for Google the sitemap and Search Console are the whole story.
 *
 *   npm run indexnow -- --all                  every URL in the live sitemap (first run)
 *   npm run indexnow -- --since 2026-09-20     sitemap URLs whose lastmod is on/after that date
 *   npm run indexnow -- /studies /help         specific paths (or full URLs)
 *   ... --dry-run                              print what would be sent, send nothing
 *
 * Reads the LIVE sitemap, so run it after the deploy that changed the pages.
 * Submit changed URLs only: re-sending the whole site on every deploy is what
 * IndexNow asks sites not to do, and engines throttle hosts that do it.
 *
 * The key is public by design. It is served from public/<key>.txt at the site
 * root, which is how the engines verify that this host sent the submission;
 * the script checks that file is live before sending anything.
 */

// Keep in step with BASE_URL in lib/seo/constants.ts (www is canonical).
const HOST = "www.bijbelstudie.io";
const BASE = `https://${HOST}`;
const KEY = "c8dff33cfc7531105e13b3314b42b846";
const KEY_LOCATION = `${BASE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
/** Protocol limit per request. */
const MAX_PER_REQUEST = 10000;

const STATUS = {
  200: "OK - URLs ontvangen.",
  202: "Geaccepteerd - key wordt nog gevalideerd; normaal bij de eerste inzending.",
  400: "Ongeldig verzoek.",
  403: "Key niet geldig: de key-file is niet gevonden of de inhoud klopt niet.",
  422: "URLs horen niet bij deze host, of de key hoort niet bij deze host.",
  429: "Te veel verzoeken - te vaak ingediend. Later opnieuw, en alleen gewijzigde URLs.",
};

function parseArgs(argv) {
  const opts = { all: false, since: null, dryRun: false, paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--all") opts.all = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--since") opts.since = argv[++i];
    else if (arg.startsWith("--since=")) opts.since = arg.slice("--since=".length);
    else if (arg.startsWith("--")) fail(`Onbekende optie: ${arg}`);
    else opts.paths.push(arg);
  }
  if (opts.since && Number.isNaN(Date.parse(opts.since))) fail(`Ongeldige datum voor --since: ${opts.since}`);
  const modes = [opts.all, Boolean(opts.since), opts.paths.length > 0].filter(Boolean).length;
  if (modes !== 1) fail("Kies precies een van: --all, --since <datum>, of een lijst met paden.");
  return opts;
}

function fail(message) {
  console.error(`indexnow: ${message}`);
  process.exit(1);
}

async function sitemapEntries() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) fail(`sitemap.xml gaf HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => ({
    loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim(),
    lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null,
  })).filter(entry => entry.loc);
}

function toUrl(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  if (!url.startsWith(`${BASE}/`) && url !== BASE) fail(`${url} hoort niet bij ${BASE}`);
  return url;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let urls;
  if (opts.paths.length > 0) {
    urls = opts.paths.map(toUrl);
  } else {
    const entries = await sitemapEntries();
    const since = opts.since ? Date.parse(opts.since) : null;
    urls = entries
      .filter(entry => since === null || (entry.lastmod && Date.parse(entry.lastmod) >= since))
      .map(entry => entry.loc);
  }
  urls = [...new Set(urls)];

  if (urls.length === 0) {
    console.log("indexnow: niets in te dienen.");
    return;
  }

  console.log(`indexnow: ${urls.length} URL${urls.length === 1 ? "" : "s"}`);
  for (const url of urls) console.log(`  ${url}`);
  if (opts.dryRun) {
    console.log("indexnow: --dry-run, niets verstuurd.");
    return;
  }

  const keyRes = await fetch(KEY_LOCATION);
  const keyText = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyText !== KEY) {
    fail(`${KEY_LOCATION} is niet live of bevat de verkeerde key (HTTP ${keyRes.status}). Deploy public/${KEY}.txt naar productie en probeer opnieuw.`);
  }

  for (let i = 0; i < urls.length; i += MAX_PER_REQUEST) {
    const urlList = urls.slice(i, i + MAX_PER_REQUEST);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    const meaning = STATUS[res.status] ?? "Onverwacht antwoord.";
    console.log(`indexnow: HTTP ${res.status} - ${meaning}`);
    if (res.status >= 400) process.exitCode = 1;
  }
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
