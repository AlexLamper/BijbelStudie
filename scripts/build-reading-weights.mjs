/*
 * build-reading-weights.mjs - DAILY_HABIT_PLAN.md §4 ("Bijbel in een jaar")
 *
 * Reads the public-domain Statenvertaling straight off disk
 * (public/data/bibles/statenvertaling/<Boek>/<n>.json - never a database, never
 * the network) and writes lib/data/bible-chapter-weights.ts: one reading weight
 * per chapter, used by lib/bibleYear/schedule.ts to give every day an even
 * reading length.
 *
 * The weight is the CHARACTER COUNT of the chapter's text, not its verse count:
 * the SV export truncates each chapter to the KJV verse count and folds its own
 * extra verses into the last verse string (see lib/chapterPages.ts), and verse
 * lengths vary wildly anyway. The inline "[ (Psalms 51:20)" markers and their
 * closing brackets are stripped before counting; whitespace is collapsed.
 *
 * Usage:  node scripts/build-reading-weights.mjs          # write the file
 *         node scripts/build-reading-weights.mjs --check  # compare, write nothing
 *
 * Changing the output changes every Bijbel-in-een-jaar schedule. Running
 * enrollments are pinned to a SCHEDULE_VERSION, so after a regenerate that
 * changes any weight, bump SCHEDULE_VERSION in lib/bibleYear/schedule.ts and
 * keep the old weights reachable for the old version.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CODES_IN_ORDER, bookNameToCode } from './audit-versification.mjs';

const ROOT = process.cwd();
const SV_DIR = path.join(ROOT, 'public', 'data', 'bibles', 'statenvertaling');
const OUT = path.join(ROOT, 'lib', 'data', 'bible-chapter-weights.ts');
const CHECK = process.argv.includes('--check');

/** Canonical Dutch names, same spelling as lib/readChaptersCanon.ts NL_IN_ORDER. */
const NL_IN_ORDER = [
  'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium', 'Jozua',
  'Richteren', 'Ruth', '1 Samuël', '2 Samuël', '1 Koningen', '2 Koningen',
  '1 Kronieken', '2 Kronieken', 'Ezra', 'Nehemia', 'Esther', 'Job', 'Psalmen',
  'Spreuken', 'Prediker', 'Hooglied', 'Jesaja', 'Jeremia', 'Klaagliederen',
  'Ezechiël', 'Daniël', 'Hosea', 'Joël', 'Amos', 'Obadja', 'Jona', 'Micha',
  'Nahum', 'Habakuk', 'Zefanja', 'Haggaï', 'Zacharia', 'Maleachi', 'Mattheüs',
  'Markus', 'Lukas', 'Johannes', 'Handelingen', 'Romeinen', '1 Korinthe',
  '2 Korinthe', 'Galaten', 'Efeziërs', 'Filippenzen', 'Kolossenzen',
  '1 Thessalonicenzen', '2 Thessalonicenzen', '1 Timotheüs', '2 Timotheüs',
  'Titus', 'Filémon', 'Hebreeën', 'Jakobus', '1 Petrus', '2 Petrus',
  '1 Johannes', '2 Johannes', '3 Johannes', 'Judas', 'Openbaring',
];

const OVERFLOW_MARKER = /\[\s*\(\s*[^()]*?\s*\d+\s*:\s*\d+\s*\)/g;

function chapterChars(obj) {
  let text = '';
  const keys = Object.keys(obj).filter((k) => Number.isFinite(Number(k)));
  keys.sort((a, b) => Number(a) - Number(b));
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') text += ' ' + v;
  }
  const clean = text
    .replace(/<[^>]*>/g, ' ')
    .replace(OVERFLOW_MARKER, ' ')
    .replace(/[[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length;
}

function fail(msg) {
  console.error(`build-reading-weights: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SV_DIR)) fail(`Statenvertaling not found at ${SV_DIR} (run npm run sync-data)`);

const byCode = new Map();
for (const entry of fs.readdirSync(SV_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const code = bookNameToCode(entry.name);
  if (!code) fail(`unknown book folder "${entry.name}"`);
  if (byCode.has(code)) fail(`two folders for ${code}`);
  const dir = path.join(SV_DIR, entry.name);
  const chapters = [];
  for (const f of fs.readdirSync(dir)) {
    // Files are named "<Boek><n>.json" ("1 Corinthiërs10.json"); chapters.json is an index.
    if (f === 'chapters.json') continue;
    const m = f.match(/(\d+)\.json$/);
    if (!m) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    chapters[Number(m[1]) - 1] = chapterChars(data);
  }
  byCode.set(code, chapters);
}

const books = CODES_IN_ORDER.map((code, i) => {
  const w = byCode.get(code);
  if (!w) fail(`missing book ${code}`);
  for (let c = 0; c < w.length; c++) {
    if (!(w[c] > 0)) fail(`${code} ${c + 1} missing or empty`);
  }
  return { code, name: NL_IN_ORDER[i], testament: i < 39 ? 'OT' : 'NT', weights: w };
});

const total = books.reduce((n, b) => n + b.weights.length, 0);
const ot = books.slice(0, 39).reduce((n, b) => n + b.weights.length, 0);
const nt = total - ot;
if (books.length !== 66) fail(`expected 66 books, got ${books.length}`);
if (total !== 1189 || ot !== 929 || nt !== 260) fail(`chapter counts ${total}/${ot}/${nt}, expected 1189/929/260`);

// Sanity: no two chapters with identical long text length streaks (the old Haggai defect
// was 38 verses of copied text; a whole book of equal weights would flag it).
for (const b of books) {
  if (b.weights.length > 1 && new Set(b.weights).size === 1) fail(`${b.code}: every chapter has the same weight`);
}

const chars = books.reduce((n, b) => n + b.weights.reduce((s, x) => s + x, 0), 0);
const all = books.flatMap((b) => b.weights).sort((a, b) => a - b);

const lines = books.map(
  (b) => `  { code: '${b.code}', name: '${b.name}', testament: '${b.testament}', weights: [${b.weights.join(', ')}] },`,
);
const out = `/**
 * Reading weight per chapter for "Bijbel in een jaar" (lib/bibleYear/schedule.ts).
 *
 * GENERATED by scripts/build-reading-weights.mjs from the public-domain
 * Statenvertaling - do not edit by hand. Weight = number of characters of the
 * chapter text (overflow verse markers stripped, whitespace collapsed).
 *
 * Changing any number changes every schedule: bump SCHEDULE_VERSION first.
 *
 * 66 books, 1189 chapters (929 OT, 260 NT), ${chars} characters.
 */

export type BookWeights = {
  /** Canonical code, lib/readChaptersCanon.ts CODES_IN_ORDER. */
  code: string;
  /** Canonical Dutch name as used in readChapters. */
  name: string;
  testament: 'OT' | 'NT';
  /** weights[chapter - 1] = characters in that chapter. */
  weights: readonly number[];
};

export const BIBLE_CHAPTER_WEIGHTS: readonly BookWeights[] = [
${lines.join('\n')}
];
`;

if (CHECK) {
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === out;
  console.log(same ? 'up to date' : 'DIFFERS from committed file');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(OUT, out);
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`books ${books.length}, chapters ${total} (OT ${ot}, NT ${nt}), characters ${chars}`);
console.log(`chapter chars min ${all[0]}, median ${all[all.length >> 1]}, max ${all[all.length - 1]}`);
const top = books.flatMap((b) => b.weights.map((w, i) => [`${b.code}.${i + 1}`, w])).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`longest: ${top.map(([r, w]) => `${r}=${w}`).join(', ')}`);
