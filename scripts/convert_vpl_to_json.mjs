import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data', 'bibles');

// Standard OSIS book abbreviation → [Dutch name (Statenvertaling canonical), numeric ID]
const BOOK_MAP = {
  GEN: ['Genesis', 1],
  EXO: ['Exodus', 2],
  LEV: ['Leviticus', 3],
  NUM: ['Numberi', 4],
  DEU: ['Deuteronomium', 5],
  JOS: ['Jozua', 6],
  JDG: ['Richteren', 7],
  RUT: ['Ruth', 8],
  '1SA': ['1 Samuël', 9],
  '2SA': ['2 Samuël', 10],
  '1KI': ['1 Koningen', 11],
  '2KI': ['2 Koningen', 12],
  '1CH': ['1 Kronieken', 13],
  '2CH': ['2 Kronieken', 14],
  EZR: ['Ezra', 15],
  NEH: ['Nehemia', 16],
  EST: ['Esther', 17],
  JOB: ['Job', 18],
  PSA: ['Psalmen', 19],
  PRO: ['Spreuken', 20],
  ECC: ['Prediker', 21],
  SNG: ['Hooglied', 22],
  ISA: ['Jesaja', 23],
  JER: ['Jeremia', 24],
  LAM: ['Klaagliederen', 25],
  EZK: ['Ezechiël', 26],
  DAN: ['Daniël', 27],
  HOS: ['Hosea', 28],
  JOL: ['Joël', 29],
  AMO: ['Amos', 30],
  OBA: ['Obadja', 31],
  JON: ['Jona', 32],
  MIC: ['Micha', 33],
  NAM: ['Nahum', 34],
  HAB: ['Habakuk', 35],
  ZEP: ['Zefanja', 36],
  HAG: ['Haggaï', 37],
  ZEC: ['Zacharia', 38],
  MAL: ['Maleachi', 39],
  MAT: ['Mattheüs', 40],
  MRK: ['Markus', 41],
  LUK: ['Lukas', 42],
  JHN: ['Johannes', 43],
  ACT: ['Handelingen', 44],
  ROM: ['Romeinen', 45],
  '1CO': ['1 Corinthiërs', 46],
  '2CO': ['2 Corinthiër', 47],
  GAL: ['Galaten', 48],
  EPH: ['Efeziërs', 49],
  PHP: ['Filippenzen', 50],
  COL: ['Colossenzen', 51],
  '1TH': ['1 Thessalonicenzen', 52],
  '2TH': ['2 Thessalonicenzen', 53],
  '1TI': ['1 Timotheüs', 54],
  '2TI': ['2 Timotheüs', 55],
  TIT: ['Titus', 56],
  PHM: ['Filémon', 57],
  HEB: ['Hebreeën', 58],
  JAS: ['Jakobus', 59],
  '1PE': ['1 Petrus', 60],
  '2PE': ['2 Petrus', 61],
  '1JN': ['1 Johannes', 62],
  '2JN': ['2 Johannes', 63],
  '3JN': ['3 Johannes', 64],
  JUD: ['Judas', 65],
  REV: ['Openbaring', 66],
  // Deuterocanonical books (Canisiusbijbel / Catholic bibles)
  TOB: ['Tobit', 67],
  JDT: ['Judit', 68],
  '1MA': ['1 Makkabeeën', 69],
  '2MA': ['2 Makkabeeën', 70],
  WIS: ['Wijsheid', 71],
  SIR: ['Wijsheid van Jezus Sirach', 72],
  BAR: ['Baruch', 73],
  DNG: ['Daniël (Grieks)', 74],
  // Common VPL alternative abbreviations
  SOL: ['Hooglied', 22],
  MAR: ['Markus', 41],
  JOH: ['Johannes', 43],
  PHI: ['Filippenzen', 50],
  JAM: ['Jakobus', 59],
  '1JO': ['1 Johannes', 62],
  '2JO': ['2 Johannes', 63],
  '3JO': ['3 Johannes', 64],
  EZE: ['Ezechiël', 26],
  JOE: ['Joël', 29],
  NAH: ['Nahum', 34],
  OBD: ['Obadja', 31],
};

const TRANSLATIONS = [
  {
    folder: 'nld_vpl',
    file: 'nld_vpl.txt',
    output: 'heilige_schrift_1917.json',
    metadata: {
      name: 'De Heilige Schrift 1917',
      shortname: 'HS1917',
      module: 'heilige_schrift_1917',
      year: '1917',
      publisher: null,
      owner: null,
      description: 'De Heilige Schrift (1917) - Nederlandse Bijbelvertaling',
      lang: 'Dutch',
      lang_short: 'nl',
      copyright: 0,
      copyright_statement: 'This Bible is in the Public Domain.',
      url: null,
      citation_limit: 0,
      restrict: 0,
      italics: 0,
      strongs: 0,
      red_letter: 0,
      paragraph: 0,
      official: 1,
      research: 0,
      module_version: '1.0.0',
    },
  },
  {
    folder: 'nldnbg_vpl',
    file: 'nldnbg_vpl.txt',
    output: 'nbg51.json',
    metadata: {
      name: 'NBG-vertaling 1951',
      shortname: 'NBG51',
      module: 'nbg51',
      year: '1951',
      publisher: 'Nederlands Bijbelgenootschap',
      owner: null,
      description: 'NBG-vertaling 1951 - Vertaling van het Nederlands Bijbelgenootschap',
      lang: 'Dutch',
      lang_short: 'nl',
      copyright: 1,
      copyright_statement: 'Copyright © 2024 Jantinus Daling',
      url: null,
      citation_limit: 0,
      restrict: 0,
      italics: 0,
      strongs: 0,
      red_letter: 0,
      paragraph: 0,
      official: 1,
      research: 0,
      module_version: '1.0.0',
    },
  },
  {
    folder: 'nld1939_vpl',
    file: 'nld1939_vpl.txt',
    output: 'canisiusbijbel.json',
    metadata: {
      name: 'Canisiusbijbel 1939',
      shortname: 'Canis',
      module: 'canisiusbijbel',
      year: '1939',
      publisher: null,
      owner: null,
      description: 'Canisiusbijbel 1939 - Rooms-Katholieke Bijbelvertaling',
      lang: 'Dutch',
      lang_short: 'nl',
      copyright: 0,
      copyright_statement: 'This Bible is in the Public Domain.',
      url: null,
      citation_limit: 0,
      restrict: 0,
      italics: 0,
      strongs: 0,
      red_letter: 0,
      paragraph: 0,
      official: 1,
      research: 0,
      module_version: '1.0.0',
    },
  },
];

function parseVpl(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const verses = [];
  const unknownBooks = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Format: "BOOK CHAPTER:VERSE text..."
    const match = line.match(/^(\S+)\s+(\d+):(\d+)\s+(.+)$/);
    if (!match) continue;

    const [, bookCode, chapter, verse, text] = match;
    const bookInfo = BOOK_MAP[bookCode.toUpperCase()];

    if (!bookInfo) {
      unknownBooks.add(bookCode);
      continue;
    }

    verses.push({
      book_name: bookInfo[0],
      book: bookInfo[1],
      chapter: parseInt(chapter, 10),
      verse: parseInt(verse, 10),
      text: text.trim(),
    });
  }

  if (unknownBooks.size > 0) {
    console.warn(`  Onbekende boekafkortingen overgeslagen: ${[...unknownBooks].join(', ')}`);
  }

  return verses;
}

for (const t of TRANSLATIONS) {
  const inputPath = join(DATA_DIR, t.folder, t.file);
  const outputPath = join(DATA_DIR, t.output);

  console.log(`\nVerwerken: ${t.folder}/${t.file}`);

  const verses = parseVpl(inputPath);
  console.log(`  ${verses.length} verzen gevonden`);

  const json = { metadata: t.metadata, verses };
  writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf-8');
  console.log(`  Opgeslagen als: ${t.output}`);
}

console.log('\nKlaar!');
