/*
 * Parse STEPBible TAHOT (Hebrew OT) and TAGNT (Greek NT) text files into
 * compact per-chapter JSON files under /public/data/original/<bookCode>/<chapter>.json
 *
 * Source files (CC BY 4.0, https://github.com/STEPBible/STEPBible-Data):
 *   TAHOT Gen-Deu, TAHOT Jos-Est, TAHOT Job-Sng, TAHOT Isa-Mal
 *   TAGNT Mat-Jhn, TAGNT Act-Rev
 *
 * Place the .txt files in /tmp/stepbible/ (or set SRC env var) before running.
 *
 * Output per chapter:
 *   { "1": [ { h, t, e, s }, ... ], "2": [ ... ], ... }
 *   h = original-language surface form (Hebrew/Greek)
 *   t = transliteration
 *   e = English gloss/translation
 *   s = Strong's number (e.g. "H0376" or "G0976")
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const SRC = process.env.SRC || '/tmp/stepbible';
const OUT = path.resolve(process.argv[2] || 'public/data/original');

// STEPBible 3-letter book code → canonical English book name (matches bookNameMap targets)
const CODE_TO_BOOK = {
  // OT
  Gen: 'Genesis', Exo: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deu: 'Deuteronomy',
  Jos: 'Joshua', Jdg: 'Judges', Rut: 'Ruth',
  '1Sa': '1 Samuel', '2Sa': '2 Samuel', '1Ki': '1 Kings', '2Ki': '2 Kings',
  '1Ch': '1 Chronicles', '2Ch': '2 Chronicles',
  Ezr: 'Ezra', Neh: 'Nehemiah', Est: 'Esther',
  Job: 'Job', Psa: 'Psalms', Pro: 'Proverbs', Ecc: 'Ecclesiastes', Sng: 'Song of Solomon',
  Isa: 'Isaiah', Jer: 'Jeremiah', Lam: 'Lamentations', Ezk: 'Ezekiel', Dan: 'Daniel',
  Hos: 'Hosea', Jol: 'Joel', Amo: 'Amos', Oba: 'Obadiah', Jon: 'Jonah',
  Mic: 'Micah', Nam: 'Nahum', Hab: 'Habakkuk', Zep: 'Zephaniah', Hag: 'Haggai',
  Zec: 'Zechariah', Mal: 'Malachi',
  // NT
  Mat: 'Matthew', Mrk: 'Mark', Luk: 'Luke', Jhn: 'John', Act: 'Acts',
  Rom: 'Romans', '1Co': '1 Corinthians', '2Co': '2 Corinthians',
  Gal: 'Galatians', Eph: 'Ephesians', Php: 'Philippians', Col: 'Colossians',
  '1Th': '1 Thessalonians', '2Th': '2 Thessalonians',
  '1Ti': '1 Timothy', '2Ti': '2 Timothy', Tit: 'Titus', Phm: 'Philemon',
  Heb: 'Hebrews', Jas: 'James', '1Pe': '1 Peter', '2Pe': '2 Peter',
  '1Jn': '1 John', '2Jn': '2 John', '3Jn': '3 John', Jud: 'Jude', Rev: 'Revelation',
};

const HEBREW_FILES = [
  'TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
];
const GREEK_FILES = [
  'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
];

// Ref looks like "Job.1.1#01=L", "1Co.13.4#03=NKO", or "Gen.32.1(32.2)#01=L"
// (the parenthetical is the Hebrew-versification alternative — we keep the English ref before it)
const REF_RE = /^([1-3]?[A-Z][a-z]{1,3})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+(?:=.+)?$/;

/** Strip dStrong markup → first Strong's number found, e.g. "H9003/{H0776G}\H9014" → "H0776" */
function extractStrong(raw) {
  if (!raw) return '';
  // Prefer the root inside {curly braces}; else first H#### or G#### token
  const inBraces = raw.match(/\{([HG]\d+)[A-Z]?\}/);
  if (inBraces) return inBraces[1];
  const any = raw.match(/[HG]\d+/);
  return any ? any[0] : '';
}

/** Clean Hebrew word: collapse "/" prefix-separators and "\" punctuation markers into a single string. */
function cleanHebrew(s) {
  return (s || '').replace(/\\/g, '').trim();
}

/** Greek column 1 is "Βίβλος (Biblos)" → split into [greek, translit] */
function splitGreekToken(col) {
  const m = (col || '').match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (m) return [m[1].trim(), m[2].trim()];
  return [(col || '').trim(), ''];
}

/** Clean English gloss: drop angle/square bracket annotations to keep it short.
 *  We keep the words inside [brackets] because they're part of the natural translation,
 *  but drop <angle> annotations which mark Hebrew words best omitted in English. */
function cleanGloss(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseFile(filepath, kind /* 'H' | 'G' */) {
  console.log(`Parsing ${path.basename(filepath)}...`);
  if (!fs.existsSync(filepath)) {
    console.warn(`  MISSING: ${filepath} — skipping`);
    return {};
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filepath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  // chapters[bookCode][chapter][verseNum] = [ {h,t,e,s}, ... ]
  const out = {};

  for await (const line of rl) {
    if (!line || line.startsWith('#') || line.startsWith('=')) continue;
    const cols = line.split('\t');
    if (cols.length < 4) continue;
    const ref = cols[0];
    const m = ref.match(REF_RE);
    if (!m) continue;
    const [, code, chapStr, verseStr] = m;
    if (!CODE_TO_BOOK[code]) continue;

    let h, t, e, s;
    if (kind === 'H') {
      // Hebrew: Ref | Hebrew | Translit | Translation | dStrongs | Grammar | ...
      h = cleanHebrew(cols[1]);
      t = (cols[2] || '').trim();
      e = cleanGloss(cols[3]);
      s = extractStrong(cols[4]);
    } else {
      // Greek: Ref | Greek (Translit) | Translation | dStrongs=Grammar | Lemma=Gloss | ...
      const [greek, translit] = splitGreekToken(cols[1]);
      h = greek;
      t = translit;
      e = cleanGloss(cols[2]);
      const strRaw = (cols[3] || '').split('=')[0];
      s = extractStrong(strRaw);
    }

    if (!h) continue;

    const bookBucket = (out[code] ||= {});
    const chapBucket = (bookBucket[chapStr] ||= {});
    (chapBucket[verseStr] ||= []).push({ h, t, e, s });
  }

  return out;
}

async function main() {
  const all = {};
  for (const f of HEBREW_FILES) Object.assign(all, await parseFile(path.join(SRC, f), 'H'));
  for (const f of GREEK_FILES)  Object.assign(all, await parseFile(path.join(SRC, f), 'G'));

  fs.mkdirSync(OUT, { recursive: true });
  let totalFiles = 0;
  const index = {};

  for (const [code, chapters] of Object.entries(all)) {
    const book = CODE_TO_BOOK[code];
    const slug = book.replace(/ /g, '_');
    const dir = path.join(OUT, slug);
    fs.mkdirSync(dir, { recursive: true });

    const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
    const NT_CODES = new Set(['Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev']);
    index[book] = { code, slug, chapters: chapterNums, lang: NT_CODES.has(code) ? 'grc' : 'heb' };

    for (const chap of chapterNums) {
      const verses = chapters[chap];
      // Sort verse numbers numerically
      const sortedVerses = {};
      for (const v of Object.keys(verses).map(Number).sort((a, b) => a - b)) {
        sortedVerses[v] = verses[v];
      }
      const filePath = path.join(dir, `${chap}.json`);
      fs.writeFileSync(filePath, JSON.stringify(sortedVerses));
      totalFiles++;
    }
    console.log(`  ${book} (${code}): ${chapterNums.length} chapters`);
  }

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`\nDone — wrote ${totalFiles} chapter files + index.json to ${OUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
