#!/usr/bin/env node
/**
 * Index status of every sitemap URL, straight from Google: the Search Console
 * URL Inspection API, the same answer as pasting each URL into the inspect bar.
 * Read-only - it cannot request indexing (Google offers no API for that on
 * ordinary pages) and changes nothing in Search Console.
 *
 *   $env:GSC_KEY_FILE="C:\Users\<jij>\.secrets\gsc-service-account.json"   (PowerShell)
 *   npm run gsc-inspect                        every URL in the live sitemap
 *   npm run gsc-inspect -- /studies /help      specific paths or full URLs
 *   npm run gsc-inspect -- --csv out.csv       also write the results to a CSV
 *
 * One-time setup (about 15 minutes):
 *   1. console.cloud.google.com -> new project -> "APIs en services" ->
 *      enable "Google Search Console API".
 *   2. "Inloggegevens" -> "Serviceaccount maken" -> open it -> "Sleutels" ->
 *      "Sleutel toevoegen" -> JSON. Save the file OUTSIDE this repository.
 *   3. Search Console -> Instellingen -> Gebruikers en rechten -> Gebruiker
 *      toevoegen -> the service account's e-mail address, permission "Beperkt".
 *
 * The key file is a credential: never commit it, never paste it anywhere.
 * Quota is 2000 inspections per day and 600 per minute per property.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, relative } from "path";
import { createSign } from "crypto";

const BASE = "https://www.bijbelstudie.io";
const SITE_URL = process.env.GSC_SITE || "sc-domain:bijbelstudie.io";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const CONCURRENCY = 3;

function fail(message) {
  console.error(`gsc-inspect: ${message}`);
  process.exit(1);
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: key.client_email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(key.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) fail(`inloggen mislukt: ${data.error_description ?? data.error ?? res.status}`);
  return data.access_token;
}

async function sitemapUrls() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

async function inspect(token, url) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL, languageCode: "nl" }),
  });
  const data = await res.json();
  if (!res.ok) {
    const reason = data.error?.message ?? res.status;
    if (res.status === 403) fail(`geen toegang tot ${SITE_URL}: ${reason}. Is het serviceaccount als gebruiker toegevoegd in Search Console?`);
    return { url, verdict: "ERROR", coverage: String(reason) };
  }
  const status = data.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: status.verdict ?? "",
    coverage: status.coverageState ?? "",
    lastCrawl: status.lastCrawlTime ?? "",
    fetch: status.pageFetchState ?? "",
    robots: status.robotsTxtState ?? "",
    googleCanonical: status.googleCanonical ?? "",
    userCanonical: status.userCanonical ?? "",
  };
}

async function main() {
  const argv = process.argv.slice(2);
  let csvPath = null;
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--csv") csvPath = argv[++i];
    else if (argv[i].startsWith("--")) fail(`onbekende optie: ${argv[i]}`);
    else paths.push(argv[i]);
  }

  const keyFile = process.env.GSC_KEY_FILE;
  if (!keyFile) fail("zet GSC_KEY_FILE op het pad van de JSON-sleutel van het serviceaccount (zie de uitleg bovenin dit script).");
  if (!relative(process.cwd(), resolve(keyFile)).startsWith("..")) {
    fail("de sleutel staat in deze repository. Zet hem erbuiten, zodat hij nooit per ongeluk wordt gecommit.");
  }
  const key = JSON.parse(readFileSync(keyFile, "utf-8"));

  const urls = paths.length
    ? paths.map(p => (p.startsWith("http") ? p : `${BASE}${p.startsWith("/") ? "" : "/"}${p}`))
    : await sitemapUrls();
  const token = await accessToken(key);

  const results = [];
  const queue = [...urls];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) results.push(await inspect(token, queue.shift()));
  }));
  results.sort((a, b) => urls.indexOf(a.url) - urls.indexOf(b.url));

  const byCoverage = new Map();
  for (const r of results) byCoverage.set(r.coverage, [...(byCoverage.get(r.coverage) ?? []), r]);
  console.log(`${results.length} URLs gecontroleerd in ${SITE_URL}\n`);
  for (const [coverage, rows] of [...byCoverage].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${coverage || "(onbekend)"}: ${rows.length}`);
    if (!rows.every(r => r.verdict === "PASS")) {
      for (const r of rows) {
        const canonical = r.googleCanonical && r.googleCanonical !== r.url ? `  Google kiest: ${r.googleCanonical}` : "";
        console.log(`  ${r.url.slice(BASE.length) || "/"}  ${r.lastCrawl ? `(gecrawld ${r.lastCrawl.slice(0, 10)})` : "(nooit gecrawld)"}${canonical}`);
      }
    }
  }

  if (csvPath) {
    const header = ["url", "verdict", "coverage", "lastCrawl", "fetch", "robots", "googleCanonical", "userCanonical"];
    const escape = value => `"${String(value).replace(/"/g, '""')}"`;
    writeFileSync(csvPath, [header.join(","), ...results.map(r => header.map(h => escape(r[h] ?? "")).join(","))].join("\n"));
    console.log(`\nCSV: ${csvPath}`);
  }
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
