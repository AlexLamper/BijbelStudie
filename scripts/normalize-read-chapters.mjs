/**
 * One-off: fold every user's `readChapters` map onto canonical Dutch book names.
 *
 *   node scripts/normalize-read-chapters.mjs           # dry run, prints a diff
 *   node scripts/normalize-read-chapters.mjs --apply    # writes the changes
 *
 * WHY. `POST /last-read` used to store one key per book spelled as the
 * translation being read spells it: "1 Corinthiërs" and the source-data typo
 * "Numberi" from the Statenvertaling, "John" from an English-keyed one, and so
 * on. Both dashboards look those keys up against a single fixed Dutch list, so
 * chapters opened under any other spelling never counted towards
 * "… van 66 boeken geopend" and never coloured the heat map.
 *
 * It also drops keys that are not book names at all - `$*` above all, which is
 * the Map's own schema path and made Mongoose refuse to hydrate the field, so
 * the dashboards saw an empty map however much the user had read.
 *
 * The API routes now canonicalise on the way in and on the way out, so new
 * writes are clean and reads are corrected on the fly. This script rewrites the
 * stored documents so the correction is not recomputed on every request and so
 * ad-hoc queries see the truth too.
 *
 * The canon below is a hand-copy of `lib/readChaptersCanon.ts` (which Node
 * cannot import from a plain `.mjs` without a TypeScript loader). `tests/
 * readChaptersCanon.test.ts` guards that the two stay in step.
 *
 * ENVIRONMENT. Ambient MONGODB_URI wins; `.env.local` is the fallback for local
 * runs. Idempotent — running it twice changes nothing the second time.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ── canon (mirror of lib/readChaptersCanon.ts) ────────────────────────────────
const CODES = [
  'GEN', 'EXOD', 'LEV', 'NUM', 'DEUT', 'JOSH', 'JUDG', 'RUTH', '1SAM', '2SAM',
  '1KGS', '2KGS', '1CHR', '2CHR', 'EZRA', 'NEH', 'ESTH', 'JOB', 'PS', 'PROV',
  'ECCL', 'SONG', 'ISA', 'JER', 'LAM', 'EZEK', 'DAN', 'HOS', 'JOEL', 'AMOS',
  'OBAD', 'JONAH', 'MIC', 'NAH', 'HAB', 'ZEPH', 'HAG', 'ZECH', 'MAL',
  'MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM', '1COR', '2COR', 'GAL', 'EPH',
  'PHIL', 'COL', '1THESS', '2THESS', '1TIM', '2TIM', 'TITUS', 'PHLM', 'HEB',
  'JAS', '1PET', '2PET', '1JOHN', '2JOHN', '3JOHN', 'JUDE', 'REV',
];
const NL = [
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
const EN = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua',
  'judges', 'ruth', '1 samuel', '2 samuel', '1 kings', '2 kings',
  '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalms',
  'proverbs', 'ecclesiastes', 'song of solomon', 'isaiah', 'jeremiah',
  'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
  'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah',
  'malachi', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans',
  '1 corinthians', '2 corinthians', 'galatians', 'ephesians', 'philippians',
  'colossians', '1 thessalonians', '2 thessalonians', '1 timothy', '2 timothy',
  'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter', '1 john',
  '2 john', '3 john', 'jude', 'revelation',
];
const NL_NORM = [
  'genesis', 'exodus', 'leviticus', 'numeri', 'deuteronomium', 'jozua',
  'richteren', 'rechters', 'ruth', '1 samuel', '2 samuel', '1 koningen',
  '2 koningen', '1 kronieken', '2 kronieken', 'ezra', 'nehemia', 'esther',
  'job', 'psalmen', 'psalm', 'spreuken', 'prediker', 'hooglied', 'jesaja',
  'jeremia', 'klaagliederen', 'ezechiel', 'daniel', 'hosea', 'joel', 'amos',
  'obadja', 'jona', 'micha', 'nahum', 'habakuk', 'zefanja', 'haggai',
  'zacharia', 'maleachi', 'mattheus', 'matteus', 'markus', 'marcus', 'lukas',
  'lucas', 'johannes', 'handelingen', 'romeinen', '1 korinthe', '1 korintiers',
  '1 korinthiers', '1 corinthiers', '1 corinthier', '2 korinthe', '2 korintiers',
  '2 korinthiers', '2 corinthiers', '2 corinthier', 'galaten', 'efeziers',
  'filippenzen', 'kolossenzen', 'colossenzen', '1 thessalonicenzen',
  '1 tessalonicenzen', '2 thessalonicenzen', '2 tessalonicenzen', '1 timotheus',
  '2 timotheus', 'titus', 'filemon', 'hebreeen', 'jakobus', '1 petrus',
  '2 petrus', '1 johannes', '2 johannes', '3 johannes', 'judas', 'openbaring',
  'numberi', 'canticum canticorum',
];
// normalised Dutch spelling → code
const NL_TO_CODE = {
  genesis: 'GEN', exodus: 'EXOD', leviticus: 'LEV', numeri: 'NUM', numberi: 'NUM',
  deuteronomium: 'DEUT', jozua: 'JOSH', richteren: 'JUDG', rechters: 'JUDG',
  ruth: 'RUTH', '1 samuel': '1SAM', '2 samuel': '2SAM', '1 koningen': '1KGS',
  '2 koningen': '2KGS', '1 kronieken': '1CHR', '2 kronieken': '2CHR', ezra: 'EZRA',
  nehemia: 'NEH', esther: 'ESTH', job: 'JOB', psalmen: 'PS', psalm: 'PS',
  spreuken: 'PROV', prediker: 'ECCL', hooglied: 'SONG',
  'canticum canticorum': 'SONG', jesaja: 'ISA', jeremia: 'JER',
  klaagliederen: 'LAM', ezechiel: 'EZEK', daniel: 'DAN', hosea: 'HOS',
  joel: 'JOEL', amos: 'AMOS', obadja: 'OBAD', jona: 'JONAH', micha: 'MIC',
  nahum: 'NAH', habakuk: 'HAB', zefanja: 'ZEPH', haggai: 'HAG', zacharia: 'ZECH',
  maleachi: 'MAL', mattheus: 'MATT', matteus: 'MATT', markus: 'MARK',
  marcus: 'MARK', lukas: 'LUKE', lucas: 'LUKE', johannes: 'JOHN',
  handelingen: 'ACTS', romeinen: 'ROM', '1 korinthe': '1COR',
  '1 korintiers': '1COR', '1 korinthiers': '1COR', '1 corinthiers': '1COR',
  '1 corinthier': '1COR', '2 korinthe': '2COR', '2 korintiers': '2COR',
  '2 korinthiers': '2COR', '2 corinthiers': '2COR', '2 corinthier': '2COR',
  galaten: 'GAL', efeziers: 'EPH', filippenzen: 'PHIL', kolossenzen: 'COL',
  colossenzen: 'COL', '1 thessalonicenzen': '1THESS', '1 tessalonicenzen': '1THESS',
  '2 thessalonicenzen': '2THESS', '2 tessalonicenzen': '2THESS',
  '1 timotheus': '1TIM', '2 timotheus': '2TIM', titus: 'TITUS', filemon: 'PHLM',
  hebreeen: 'HEB', jakobus: 'JAS', '1 petrus': '1PET', '2 petrus': '2PET',
  '1 johannes': '1JOHN', '2 johannes': '2JOHN', '3 johannes': '3JOHN',
  judas: 'JUDE', openbaring: 'REV',
};
void EN; void NL_NORM; // kept for reference against the .ts source
const EN_TO_CODE = Object.fromEntries(EN.map((e, i) => [e, CODES[i]]));
const CODE_TO_NL = Object.fromEntries(CODES.map((c, i) => [c, NL[i]]));

const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

function toCanonicalDutchBook(name) {
  if (!name || typeof name !== 'string') return null;
  const k = norm(name);
  const code = NL_TO_CODE[k] ?? EN_TO_CODE[k] ?? null;
  return code ? CODE_TO_NL[code] : null;
}

function canonicaliseReadChapters(raw) {
  const out = {};
  if (!raw) return out;
  for (const [book, chapters] of Object.entries(raw)) {
    // `$*` is the schema path of the Map itself and got serialised into live
    // documents as a literal key. Keeping it is not cosmetic: Mongoose cannot
    // cast the map while it is there, so it hydrates the whole field as
    // `undefined` and every reader looks like they have opened no book at all.
    if (book.startsWith('$') || book.includes('.')) continue;
    const key = toCanonicalDutchBook(book) ?? book;
    const clean = (Array.isArray(chapters) ? chapters : []).filter(
      (n) => typeof n === 'number' && Number.isInteger(n) && n >= 1,
    );
    out[key] = Array.from(new Set([...(out[key] ?? []), ...clean])).sort((a, b) => a - b);
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}
console.log(
  `${APPLY ? 'APPLY' : 'DRY RUN'} — ${uri.replace(/\/\/[^@]*@/, '//<redacted>@').slice(0, 80)}…`,
);

const sameMap = (a, b) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every(
    (k) => a[k].length === b[k].length && a[k].every((n, i) => n === b[k][i]),
  );
};

await mongoose.connect(uri);
const users = mongoose.connection.collection('users');
const cursor = users.find(
  { readChapters: { $exists: true, $ne: {} } },
  { projection: { readChapters: 1, email: 1 } },
);

let scanned = 0;
let changed = 0;
for await (const doc of cursor) {
  scanned++;
  const raw = doc.readChapters || {};
  const canonical = canonicaliseReadChapters(raw);
  if (sameMap(raw, canonical)) continue;

  changed++;
  const before = Object.keys(raw).length;
  const after = Object.keys(canonical).length;
  console.log(
    `  ${String(doc.email || doc._id).padEnd(32)} ${before} → ${after} keys` +
      (before === after ? '' : `  (${before - after} merged)`),
  );
  if (APPLY) {
    await users.updateOne({ _id: doc._id }, { $set: { readChapters: canonical } });
  }
}

console.log(`\n${scanned} scanned, ${changed} ${APPLY ? 'updated' : 'would change'}.`);
await mongoose.disconnect();
