/*
 * audit-versification.mjs - CROSS_LINKS_PLAN.md §1.4 step 1
 *
 * Reads every bible version's JSON straight off disk (public/data/bibles and
 * private/data/bibles - never a database, never the network), counts the verses
 * in every chapter, diffs those counts against the KJV (= the English/KJV
 * versification the OpenBible cross-reference dataset is numbered in) and groups
 * versions whose diff is byte-identical into one "versification profile".
 *
 * The output of this script is the evidence behind lib/crossRefs/versionProfiles.ts.
 *
 * Usage:
 *   node scripts/audit-versification.mjs            # summary + profile grouping
 *   node scripts/audit-versification.mjs --full     # every differing chapter
 *   node scripts/audit-versification.mjs --version=statenvertaling --full
 *   node scripts/audit-versification.mjs --json     # machine-readable dump
 *
 * Nothing is written; this is a read-only report.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_BIBLES = path.join(ROOT, 'public', 'data', 'bibles');
const PRIVATE_BIBLES = path.join(ROOT, 'private', 'data', 'bibles');
const MANIFEST = path.join(ROOT, 'public', 'data', 'manifest.json');

const args = process.argv.slice(2);
const FULL = args.includes('--full');
const AS_JSON = args.includes('--json');
const ONLY = (args.find((a) => a.startsWith('--version=')) || '').split('=')[1] || null;
const BASELINE = (args.find((a) => a.startsWith('--baseline=')) || '').split('=')[1] || 'kjv';

// ---------------------------------------------------------------------------
// Book canon (mirrors CODES_IN_ORDER in lib/readChaptersCanon.ts - this file is
// .mjs and cannot import the TS module, so the list is repeated verbatim).
// ---------------------------------------------------------------------------

export const CODES_IN_ORDER = [
  'GEN', 'EXOD', 'LEV', 'NUM', 'DEUT', 'JOSH', 'JUDG', 'RUTH', '1SAM', '2SAM',
  '1KGS', '2KGS', '1CHR', '2CHR', 'EZRA', 'NEH', 'ESTH', 'JOB', 'PS', 'PROV',
  'ECCL', 'SONG', 'ISA', 'JER', 'LAM', 'EZEK', 'DAN', 'HOS', 'JOEL', 'AMOS',
  'OBAD', 'JONAH', 'MIC', 'NAH', 'HAB', 'ZEPH', 'HAG', 'ZECH', 'MAL',
  'MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM', '1COR', '2COR', 'GAL', 'EPH',
  'PHIL', 'COL', '1THESS', '2THESS', '1TIM', '2TIM', 'TITUS', 'PHLM', 'HEB',
  'JAS', '1PET', '2PET', '1JOHN', '2JOHN', '3JOHN', 'JUDE', 'REV',
];

const ENGLISH_IN_ORDER = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua',
  'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
  'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
  'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John',
  '2 John', '3 John', 'Jude', 'Revelation',
];

const DUTCH_IN_ORDER = [
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

const GERMAN_IN_ORDER = [
  '1 Mose', '2 Mose', '3 Mose', '4 Mose', '5 Mose', 'Josua', 'Richter', 'Rut',
  '1 Samuel', '2 Samuel', '1 Koenige', '2 Koenige', '1 Chronik', '2 Chronik',
  'Esra', 'Nehemia', 'Ester', 'Hiob', 'Psalm', 'Sprueche', 'Prediger',
  'Hohelied', 'Jesaja', 'Jeremia', 'Klagelieder', 'Hesekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadja', 'Jona', 'Mica', 'Nahum', 'Habakuk',
  'Zephanja', 'Haggai', 'Sacharja', 'Maleachi', 'Matthaeus', 'Markus', 'Lukas',
  'Johannes', 'Apostelgeschichte', 'Roemer', '1 Korinther', '2 Korinther',
  'Galater', 'Epheser', 'Philipper', 'Kolosser', '1 Thessalonicher',
  '2 Thessalonicher', '1 Timotheus', '2 Timotheus', 'Titus', 'Philemon',
  'Hebraeer', 'Jakobus', '1 Petrus', '2 Petrus', '1 Johannes', '2 Johannes',
  '3 Johannes', 'Judas', 'Offenbarung',
];

/** Extra spellings that the three canonical lists above do not catch. */
const EXTRA_NAMES = {
  numberi: 'NUM',              // Statenvertaling source-data typo
  '1corinthier': '1COR',
  '2corinthier': '2COR',
  '1corinthiers': '1COR',
  '2corinthiers': '2COR',
  '1korinthiers': '1COR',
  '2korinthiers': '2COR',
  colossenzen: 'COL',
  'canticumcanticorum': 'SONG',
  hooglied: 'SONG',
  roemers: 'ROM',              // luther_1912 / elberfelder_1905 folder spelling
  job: 'JOB',                  // German sets use "Job" rather than "Hiob"
  psalm: 'PS',
  spreuken: 'PROV',
  prediker: 'ECCL',
  openbaring: 'REV',
  handelingen: 'ACTS',
  'daniel(grieks)': 'DAN',     // canisiusbijbel deuterocanonical Daniel
};

function normaliseName(raw) {
  return String(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.json$/, '')
    .replace(/[^a-z0-9]/g, '');
}

const NAME_TO_CODE = new Map();
function bindNames(list) {
  list.forEach((name, i) => {
    const key = normaliseName(name);
    if (!NAME_TO_CODE.has(key)) NAME_TO_CODE.set(key, CODES_IN_ORDER[i]);
  });
}
bindNames(ENGLISH_IN_ORDER);
bindNames(DUTCH_IN_ORDER);
bindNames(GERMAN_IN_ORDER);
for (const [key, code] of Object.entries(EXTRA_NAMES)) {
  if (!NAME_TO_CODE.has(normaliseName(key))) NAME_TO_CODE.set(normaliseName(key), code);
}

export function bookNameToCode(name) {
  return NAME_TO_CODE.get(normaliseName(name)) || null;
}

// ---------------------------------------------------------------------------
// Reading a version off disk
// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function locateVersion(name) {
  for (const root of [PRIVATE_BIBLES, PUBLIC_BIBLES]) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * The Statenvertaling export truncates every chapter to the KJV verse count and
 * appends the verses its own (partly Hebrew) versification has beyond that into
 * the LAST key, tagged inline:
 *
 *   "…niet verachten. [ (Psalms 51:20) Doe wel bij Sion… ] [ (Psalms 51:21) …]"
 *
 * Counting only the JSON keys therefore reports Psalm 51 as 19 verses and hides
 * the fact that the file is numbered 1..21 with the title as v1-2. Those markers
 * are the version's own statement of its numbering, so the audit must read them.
 * Only `statenvertaling` uses them (94 markers, 80 chapters); every other version
 * on disk has zero.
 */
const OVERFLOW_MARKER = /\[\s*\(\s*[^()\d]+?\s*(\d+):(\d+)\s*\)/g;

/** Verse keys of one chapter object -> sorted numeric list (incl. overflow markers). */
function verseNumbers(chapterObj) {
  if (!chapterObj || typeof chapterObj !== 'object') return [];
  const set = new Set();
  for (const [k, text] of Object.entries(chapterObj)) {
    const n = Number(k);
    if (Number.isFinite(n)) set.add(n);
    if (typeof text !== 'string') continue;
    OVERFLOW_MARKER.lastIndex = 0;
    let m;
    while ((m = OVERFLOW_MARKER.exec(text))) set.add(Number(m[2]));
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * counts[CODE][chapter] = { n, max, min, missing: [..] }
 * n = how many verse keys the chapter actually has,
 * max/min = numeric extremes (a version that numbers psalm titles has min 1
 * and a larger max than KJV; a version starting at 0 has min 0).
 */
function readDirVersion(dir) {
  const counts = {};
  const unknownBooks = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const code = bookNameToCode(entry.name);
    if (!code) { unknownBooks.push(entry.name); continue; }
    const bookDir = path.join(dir, entry.name);
    const book = (counts[code] ||= {});
    for (const f of fs.readdirSync(bookDir)) {
      if (!f.endsWith('.json') || f === 'chapters.json') continue;
      const m = f.match(/(\d+)\.json$/);
      if (!m) continue;
      const chapter = Number(m[1]);
      let data;
      try { data = readJson(path.join(bookDir, f)); } catch { continue; }
      const verses = verseNumbers(data);
      if (!verses.length) continue;
      book[chapter] = { n: verses.length, min: verses[0], max: verses[verses.length - 1] };
    }
  }
  return { counts, unknownBooks };
}

function readFileVersion(file) {
  const counts = {};
  const unknownBooks = new Set();
  const data = readJson(file);
  const rows = Array.isArray(data) ? data : Array.isArray(data?.verses) ? data.verses : null;
  if (rows) {
    const seen = {};
    for (const row of rows) {
      const code = row.book_name ? bookNameToCode(row.book_name) : CODES_IN_ORDER[Number(row.book) - 1];
      if (!code) { if (row.book_name) unknownBooks.add(row.book_name); continue; }
      const ch = Number(row.chapter);
      const v = Number(row.verse);
      if (!Number.isFinite(ch) || !Number.isFinite(v)) continue;
      ((seen[code] ||= {})[ch] ||= new Set()).add(v);
    }
    for (const [code, chapters] of Object.entries(seen)) {
      const book = (counts[code] ||= {});
      for (const [ch, set] of Object.entries(chapters)) {
        const list = [...set].sort((a, b) => a - b);
        book[Number(ch)] = { n: list.length, min: list[0], max: list[list.length - 1] };
      }
    }
  }
  return { counts, unknownBooks: [...unknownBooks] };
}

export function readVersionCounts(name, type) {
  const loc = locateVersion(type === 'file' ? name : name);
  if (!loc) return null;
  const stat = fs.statSync(loc);
  return stat.isDirectory() ? readDirVersion(loc) : readFileVersion(loc);
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

/**
 * Compare one version against the baseline. Returns a list of human-readable
 * diff lines plus a stable signature string used to group versions.
 */
export function diffAgainstBaseline(baseCounts, counts) {
  const lines = [];
  for (const code of CODES_IN_ORDER) {
    const base = baseCounts[code];
    const mine = counts[code];
    if (!base) continue;
    if (!mine) { lines.push(`${code} MISSING`); continue; }
    const baseChapters = Object.keys(base).map(Number).sort((a, b) => a - b);
    const myChapters = Object.keys(mine).map(Number).sort((a, b) => a - b);
    const maxCh = Math.max(baseChapters[baseChapters.length - 1] || 0, myChapters[myChapters.length - 1] || 0);
    for (let ch = 1; ch <= maxCh; ch++) {
      const b = base[ch];
      const m = mine[ch];
      if (!b && !m) continue;
      if (!b) { lines.push(`${code}.${ch} extra-chapter n=${m.n}`); continue; }
      if (!m) { lines.push(`${code}.${ch} absent-chapter kjv-n=${b.n}`); continue; }
      if (b.n !== m.n || b.max !== m.max || b.min !== m.min) {
        lines.push(`${code}.${ch} ${b.n}v[${b.min}-${b.max}] -> ${m.n}v[${m.min}-${m.max}]`);
      }
    }
  }
  return { lines, signature: lines.join('\n') };
}

/** Rough classification of a diff, used to name a profile. */
export function classify(lines) {
  const tags = new Set();
  for (const line of lines) {
    if (line.startsWith('PS.')) tags.add('psalm-titles');
    if (line.startsWith('MAL.')) tags.add('malachi');
    if (line.startsWith('JOEL.')) tags.add('joel');
    if (line.startsWith('JONAH.')) tags.add('jonah');
    if (line.startsWith('3JOHN.')) tags.add('3john');
    if (line.startsWith('ROM.') || line.startsWith('2COR.') || line.startsWith('REV.')) tags.add('nt-splits');
  }
  return [...tags].sort();
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function main() {
  const manifest = readJson(MANIFEST);
  const versions = manifest.bibles.filter((b) => !ONLY || b.name.replace(/\.json$/, '') === ONLY);

  const loaded = [];
  for (const entry of versions) {
    const id = entry.name.replace(/\.json$/, '');
    const res = readVersionCounts(entry.name, entry.type);
    if (!res) { loaded.push({ id, title: entry.title, missing: true }); continue; }
    const books = Object.keys(res.counts).length;
    const chapters = Object.values(res.counts).reduce((s, b) => s + Object.keys(b).length, 0);
    const verses = Object.values(res.counts).reduce(
      (s, b) => s + Object.values(b).reduce((t, c) => t + c.n, 0), 0);
    loaded.push({ id, title: entry.title, counts: res.counts, unknownBooks: res.unknownBooks, books, chapters, verses });
  }

  const baseline = loaded.find((v) => v.id === BASELINE);
  if (!baseline || baseline.missing) {
    console.error(`Baseline version "${BASELINE}" not found on disk - cannot diff.`);
    process.exit(1);
  }

  for (const v of loaded) {
    if (v.missing || v.id === BASELINE) continue;
    const { lines, signature } = diffAgainstBaseline(baseline.counts, v.counts);
    v.diffLines = lines;
    v.signature = signature;
    v.tags = classify(lines);
  }

  if (AS_JSON) {
    console.log(JSON.stringify(loaded.map((v) => ({
      id: v.id, title: v.title, missing: !!v.missing, books: v.books, chapters: v.chapters,
      verses: v.verses, unknownBooks: v.unknownBooks, diffLines: v.diffLines, tags: v.tags,
    })), null, 2));
    return;
  }

  console.log('='.repeat(78));
  console.log(`VERSIFICATION AUDIT  (baseline: ${BASELINE})`);
  console.log('='.repeat(78));
  console.log('');
  console.log('version                  books  chapters  verses   diffs  tags');
  console.log('-'.repeat(78));
  for (const v of loaded) {
    if (v.missing) {
      console.log(`${v.id.padEnd(24)} -- not on disk (licensed data not synced locally) --`);
      continue;
    }
    const diffs = v.id === BASELINE ? 0 : v.diffLines.length;
    console.log(
      `${v.id.padEnd(24)} ${String(v.books).padStart(5)} ${String(v.chapters).padStart(9)} ` +
      `${String(v.verses).padStart(7)} ${String(diffs).padStart(7)}  ${(v.tags || []).join(',')}`,
    );
    if (v.unknownBooks?.length) {
      console.log(`${' '.repeat(25)}(skipped non-canonical: ${v.unknownBooks.join(', ')})`);
    }
  }

  // Group by identical diff signature.
  const groups = new Map();
  for (const v of loaded) {
    if (v.missing) continue;
    const sig = v.id === BASELINE ? '' : v.signature;
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig).push(v.id);
  }

  console.log('');
  console.log('='.repeat(78));
  console.log(`PROFILE GROUPS (versions with a byte-identical diff signature): ${groups.size}`);
  console.log('='.repeat(78));
  let i = 0;
  for (const [sig, ids] of groups) {
    i++;
    const count = sig ? sig.split('\n').length : 0;
    console.log('');
    console.log(`--- group ${i}: ${ids.join(', ')}  (${count} differing chapters) ---`);
    if (!sig) { console.log('    identical to baseline'); continue; }
    const lines = sig.split('\n');
    const show = FULL ? lines : lines.slice(0, 40);
    for (const line of show) console.log('    ' + line);
    if (!FULL && lines.length > show.length) {
      console.log(`    ... ${lines.length - show.length} more (run with --full)`);
    }
  }

  // Spot-check the verses CROSS_LINKS_PLAN.md §1.4 calls out.
  console.log('');
  console.log('='.repeat(78));
  console.log('SPOT CHECKS (chapter verse counts for the §1.4 cases)');
  console.log('='.repeat(78));
  const probes = [
    ['PS', 3], ['PS', 51], ['PS', 52], ['PS', 54], ['PS', 60],
    ['MAL', 3], ['MAL', 4], ['JOEL', 2], ['JOEL', 3], ['JOEL', 4],
    ['JONAH', 1], ['JONAH', 2], ['3JOHN', 1], ['ROM', 16], ['2COR', 13],
    ['REV', 12], ['REV', 13], ['ACTS', 19], ['NUM', 16], ['NUM', 17],
    ['1KGS', 4], ['1KGS', 5], ['ECCL', 4], ['ECCL', 5], ['SONG', 6], ['SONG', 7],
    ['ISA', 8], ['ISA', 9], ['HOS', 1], ['HOS', 2], ['MIC', 4], ['MIC', 5],
    ['NAH', 1], ['NAH', 2], ['ZECH', 1], ['ZECH', 2], ['DAN', 3], ['DAN', 4],
    ['DAN', 5], ['DAN', 6], ['EZEK', 20], ['EZEK', 21], ['JOB', 40], ['JOB', 41],
    ['GEN', 31], ['GEN', 32], ['EXOD', 7], ['EXOD', 8], ['LEV', 5], ['LEV', 6],
    ['DEUT', 12], ['DEUT', 13], ['1SAM', 20], ['1SAM', 24], ['2SAM', 18], ['2SAM', 19],
    ['1CHR', 5], ['1CHR', 6], ['NEH', 3], ['NEH', 4], ['JER', 8], ['JER', 9],
  ];
  const ids = loaded.filter((v) => !v.missing).map((v) => v.id);
  console.log('ref'.padEnd(11) + ids.map((id) => id.slice(0, 9).padStart(10)).join(''));
  for (const [code, ch] of probes) {
    const row = ids.map((id) => {
      const v = loaded.find((x) => x.id === id);
      const c = v.counts[code]?.[ch];
      return (c ? `${c.n}` : '-').padStart(10);
    });
    console.log(`${code}.${ch}`.padEnd(11) + row.join(''));
  }
  console.log('');
  console.log('Legend: cell = number of numbered verses in that chapter.');
}

if (process.argv[1]?.endsWith('audit-versification.mjs')) {
  main();
}
