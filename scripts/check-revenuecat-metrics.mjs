/**
 * Verify the RevenueCat metrics credentials before trusting /beheer with them.
 *
 *   node scripts/check-revenuecat-metrics.mjs
 *   node scripts/check-revenuecat-metrics.mjs <project-id> <v2-secret-key>
 *
 * The app-revenue half of the admin dashboard (lib/revenuecatMetrics.ts) is the
 * one figure on /beheer that is not a database read, and when it fails the page
 * deliberately says nothing more than "cijfer niet leesbaar": a dashboard is a
 * bad place to debug a key. This prints the whole answer instead - which key
 * was used, what RevenueCat replied, every metric in the snapshot, and the two
 * numbers the dashboard will actually render.
 *
 * It exists mostly for one failure: the project id. The number in a dashboard
 * URL (app.revenuecat.com/projects/78605419/overview) is NOT the v2 project id,
 * which looks like `proj1ab2c3d4` and lives in Project settings. Both produce a
 * 404, and only one of them is obviously wrong once you see the response.
 *
 * ENVIRONMENT. Arguments win, then the ambient environment, then .env.local.
 * Nothing here touches MongoDB, Stripe or any route - it is one GET against
 * RevenueCat, so it is safe to run against production credentials.
 */

import fs from 'fs';
import path from 'path';

// Arguments first so a key can be tried without saving it anywhere.
let [, , argProjectId, argApiKey] = process.argv;

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const projectId = (argProjectId || process.env.REVENUECAT_PROJECT_ID || '').trim();
const apiKey = (argApiKey || process.env.REVENUECAT_V2_API_KEY || '').trim();

const missing = [];
if (!projectId) missing.push('REVENUECAT_PROJECT_ID');
if (!apiKey) missing.push('REVENUECAT_V2_API_KEY');
if (missing.length) {
  console.error(`Ontbreekt: ${missing.join(', ')}`);
  console.error('Geef ze mee als argument of zet ze in .env.local:');
  console.error('  node scripts/check-revenuecat-metrics.mjs <project-id> <v2-secret-key>');
  process.exit(1);
}

/** Never print a secret in full; enough to tell two keys apart, no more. */
const fingerprint = (key) =>
  key.length <= 12 ? `${key.slice(0, 4)}…` : `${key.slice(0, 8)}…${key.slice(-4)} (${key.length} tekens)`;

console.log(`Project : ${projectId}`);
console.log(`Sleutel : ${fingerprint(apiKey)}`);

// The public SDK keys are designed to be shipped inside a client, so they carry
// no dashboard rights at all. Saying so here beats reading a 401 body.
//
// There is deliberately no warning on an `sk_` prefix: v1 REST keys and V2
// secret keys both use it, so the prefix cannot tell them apart. An earlier
// version of this script warned about it and cried wolf over a key that
// worked perfectly - a check that is wrong half the time is worse than none.
if (/^(appl|goog|amzn|rcb|strp)_/.test(apiKey)) {
  console.log('');
  console.log('LET OP: dit lijkt een publieke SDK-sleutel (die staat in de app).');
  console.log('        Die kan geen metrics lezen. Maak een V2 Secret key aan.');
}

const url =
  `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/metrics/overview` +
  `?currency=EUR`;

console.log(`GET     : ${url}`);
console.log('');

// Everything below lives in a function so a failure can `return` after setting
// an exit code. Calling process.exit() while a fetch socket is still open trips
// a libuv assertion on Windows, which prints an alarming crash under a report
// whose whole job is to be readable.
await main();

async function main() {
let res;
try {
  res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
} catch (error) {
  console.error(`Verzoek mislukt: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
  return;
}

const body = await res.text();

if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  console.error(body.slice(0, 1500));
  console.error('');
  // Each of these has exactly one likely cause, and they are easy to confuse.
  if (res.status === 401) {
    console.error('401 = de sleutel wordt niet herkend. Bijna altijd een v1- of SDK-sleutel');
    console.error('      in plaats van een V2 Secret key.');
  } else if (res.status === 403) {
    console.error('403 = de sleutel is geldig maar mist het recht charts_metrics:overview:read.');
  } else if (res.status === 404) {
    console.error('404 = het project-id klopt niet. Pak de waarde uit Project settings >');
    console.error('      General (vorm `proj…`), niet het nummer uit de dashboard-URL.');
  } else if (res.status === 429) {
    console.error('429 = te veel verzoeken (25 per minuut). Wacht even en probeer opnieuw.');
  }
  process.exitCode = 1;
  return;
}

let data;
try {
  data = JSON.parse(body);
} catch {
  console.error('Antwoord is geen JSON:');
  console.error(body.slice(0, 1000));
  process.exitCode = 1;
  return;
}

console.log(`HTTP ${res.status} - valuta: ${data?.currency ?? '(niet gemeld)'}`);
if (data?.currency && data.currency !== 'EUR') {
  console.log('LET OP: er komen geen euro\'s terug. Het dashboard telt dit bij de Stripe-euro\'s op,');
  console.log('        dus dat getal zou dan onjuist zijn. Meld dit.');
}
console.log('');

const metrics = Array.isArray(data?.metrics) ? data.metrics : [];
if (!metrics.length) {
  console.log('Geen metrics in het antwoord. Een leeg project geeft dit ook.');
}

const pad = Math.max(0, ...metrics.map((m) => String(m?.id ?? '').length));
for (const metric of metrics) {
  const id = String(metric?.id ?? '?').padEnd(pad);
  const period = metric?.period && metric.period !== 'P0D' ? ` over ${metric.period}` : '';
  // RevenueCat reports `unit` as "$" on money metrics whatever currency it was
  // asked for, so printing it verbatim beside a euro figure reads as dollars.
  // The `currency` field on the response is the one that is actually true.
  const unit = metric?.unit === '$' ? (data?.currency ?? '') : (metric?.unit ?? '');
  console.log(`  ${id}  ${metric?.value ?? '-'} ${unit}${period}`);
}

// The four ids lib/revenuecatMetrics.ts looks for. Reported separately because
// an id RevenueCat renames is silently null in the payload, not an error, and
// this is the only place that difference is visible.
const value = (id) => metrics.find((m) => String(m?.id ?? '').toLowerCase() === id)?.value;
const euro = (n) =>
  n == null || !Number.isFinite(Number(n))
    ? 'ONLEESBAAR'
    : `€ ${(Math.round(Number(n) * 100) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`;

const mrr = value('mrr');
console.log('');
console.log('Wat /beheer hiermee laat zien:');
console.log(`  MRR via de apps        ${euro(mrr)}`);
console.log(`  Omzet apps             ${euro(value('revenue'))}`);
console.log(`  Actieve app-abonnees   ${value('active_subscriptions') ?? 'ONLEESBAAR'}`);
console.log(`  Proefperiodes          ${value('active_trials') ?? 'ONLEESBAAR'}`);
console.log('');

if (mrr == null) {
  console.log('De MRR-metric ontbreekt. Het dashboard zet de totaaltegel dan op "-"');
  console.log('in plaats van alleen Stripe te laten zien. Meld dit.');
  process.exitCode = 1;
  return;
}

console.log('Sleutel werkt. Zet dezelfde twee waarden in Vercel en deploy opnieuw.');
console.log('App-cijfers zijn bruto, vóór de commissie van Apple en Google.');
}
