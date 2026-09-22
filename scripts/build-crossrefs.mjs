/*
 * build-crossrefs.mjs - CROSS_LINKS_PLAN.md §2.5
 *
 * Turns the OpenBible.info cross-reference dataset into committed per-chapter
 * shards under public/data/crossrefs/v1/<profile>/<BOOK>/<chapter>.json.
 *
 * ---------------------------------------------------------------------------
 * SOURCE / LICENCE EVIDENCE  (CC BY - attribution required, changes indicated)
 * ---------------------------------------------------------------------------
 *   Cross references : https://a.openbible.info/data/cross-references.zip
 *     downloaded      : 2026-09-22
 *     dataset dated   : 2026-09-21  (header of cross_references.txt)
 *     zip SHA-256     : 83e9db0a08054ed99848531512729f0190dbbac85416f408f2362b5dc36d421d
 *     extracted file  : scripts/.cache/cross_references.txt (344,800 lines,
 *                       tab separated: From Verse / To Verse / Votes)
 *     licence         : CC BY - www.openbible.info
 *     changes made    : rows with votes <= 0, self-references, references to a
 *                       neighbouring verse and duplicates are removed; the top
 *                       25 by votes are kept per source verse; overlapping
 *                       ranges are merged; every reference is renumbered from
 *                       English/KJV versification into the versification of the
 *                       target profile.
 *
 *   Versification    : STEPBible TVTMS, CC BY 4.0
 *     https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Versification/
 *       TVTMS - Translators Versification Traditions with Methodology for
 *       Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt
 *     downloaded      : 2026-09-22
 *     local copy      : scripts/.cache/tvtms.txt
 *     used for        : the `heb` profile (its "Renumber verse" rows, inverted
 *                       from Hebrew->English into English->Hebrew).
 *
 * Neither cache file is committed (scripts/.cache/ is gitignored); the OUTPUT
 * is committed, so Vercel builds need no network. This script is NOT part of
 * `prebuild` - run it by hand with `npm run build-crossrefs` when the dataset
 * changes, then bump v1 -> v2.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   npm run build-crossrefs                 # refuses to overwrite an existing v1
 *   node scripts/build-crossrefs.mjs --force
 *   node scripts/build-crossrefs.mjs --out=public/data/crossrefs/v2 --force
 *   node scripts/build-crossrefs.mjs --dry-run      # report only, writes nothing
 *
 * Output is deterministic: keys are sorted, refs are sorted by votes desc then
 * by canonical position, and `builtAt` is the DATASET date, not the wall clock,
 * so a re-run on unchanged input produces a byte-identical tree (no git diff).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { readVersionCounts } from './audit-versification.mjs';

// ---------------------------------------------------------------------------
// Constants (§2.3 - recorded in index.json)
// ---------------------------------------------------------------------------

export const DATASET_VERSION = 1;
export const SHARD_VERSION = 1;
export const MIN_VOTES = 1;
export const TOP_N = 25;
export const DATASET_DATE = '2026-09-21';
export const SOURCE_URL = 'https://a.openbible.info/data/cross-references.zip';
export const SOURCE_ZIP_SHA256 =
  '83e9db0a08054ed99848531512729f0190dbbac85416f408f2362b5dc36d421d';
export const ATTRIBUTION =
  'Kruisverwijzingen: OpenBible.info (CC BY), bewerkt: gefilterd en omgezet naar de ' +
  'versnummering van deze vertaling. Versnummering via STEPBible TVTMS (CC BY 4.0).';

// ---------------------------------------------------------------------------
// Book canon - CODES_IN_ORDER from lib/readChaptersCanon.ts, repeated here
// because this is a .mjs script and cannot import the TS module.
// OpenBible's OSIS ids upper-cased map 1:1 onto these codes.
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

/** canonical book index 1..66 */
export const CODE_TO_INDEX = Object.fromEntries(CODES_IN_ORDER.map((c, i) => [c, i + 1]));

/** OpenBible OSIS id (`Gen`, `1Thess`, `Phlm`, `Song`) -> canonical code. */
export const OSIS_TO_CODE = Object.fromEntries(CODES_IN_ORDER.map((c) => [c.toUpperCase(), c]));

/** STEPBible TVTMS 3-letter book code -> OpenBible OSIS id. */
export const STEP_TO_OSIS = {
  Gen: 'Gen', Exo: 'Exod', Lev: 'Lev', Num: 'Num', Deu: 'Deut', Jos: 'Josh',
  Jdg: 'Judg', Rut: 'Ruth', '1Sa': '1Sam', '2Sa': '2Sam', '1Ki': '1Kgs',
  '2Ki': '2Kgs', '1Ch': '1Chr', '2Ch': '2Chr', Ezr: 'Ezra', Neh: 'Neh',
  Est: 'Esth', Job: 'Job', Psa: 'Ps', Pro: 'Prov', Ecc: 'Eccl', Sng: 'Song',
  Isa: 'Isa', Jer: 'Jer', Lam: 'Lam', Ezk: 'Ezek', Dan: 'Dan', Hos: 'Hos',
  Jol: 'Joel', Amo: 'Amos', Oba: 'Obad', Jon: 'Jonah', Mic: 'Mic', Nam: 'Nah',
  Hab: 'Hab', Zep: 'Zeph', Hag: 'Hag', Zec: 'Zech', Mal: 'Mal', Mat: 'Matt',
  Mrk: 'Mark', Luk: 'Luke', Jhn: 'John', Act: 'Acts', Rom: 'Rom',
  '1Co': '1Cor', '2Co': '2Cor', Gal: 'Gal', Eph: 'Eph', Php: 'Phil',
  Col: 'Col', '1Th': '1Thess', '2Th': '2Thess', '1Ti': '1Tim', '2Ti': '2Tim',
  Tit: 'Titus', Phm: 'Phlm', Heb: 'Heb', Jas: 'Jas', '1Pe': '1Pet',
  '2Pe': '2Pet', '1Jn': '1John', '2Jn': '2John', '3Jn': '3John', Jud: 'Jude',
  Rev: 'Rev',
};

// ---------------------------------------------------------------------------
// Parsing the OpenBible rows
// ---------------------------------------------------------------------------

const OSIS_RE = /^([1-5]?[A-Za-z]+)\.(\d+)\.(\d+)$/;

/** "Gen.1.1" -> { code:'GEN', c:1, v:1 }; null when malformed or not a canon book. */
export function parseOsisRef(raw) {
  const m = String(raw || '').trim().match(OSIS_RE);
  if (!m) return null;
  const code = OSIS_TO_CODE[m[1].toUpperCase()];
  if (!code) return null;
  const c = Number(m[2]);
  const v = Number(m[3]);
  if (!Number.isInteger(c) || !Number.isInteger(v) || c < 1 || v < 1) return null;
  return { code, c, v };
}

/**
 * One data row: "Gen.1.1\tRom.1.19-Rom.1.20\t59".
 * Returns { from, start, end, votes } in English/KJV numbering, or null.
 * `end` is null for a single-verse target and for ranges that cross books
 * (18 rows in the dataset - we keep only their start verse).
 */
export function parseRow(line) {
  if (!line) return null;
  const cols = line.split('\t');
  if (cols.length < 3) return null;
  const from = parseOsisRef(cols[0]);
  if (!from) return null;
  const votes = Number(String(cols[2]).trim());
  if (!Number.isFinite(votes)) return null;

  const target = String(cols[1]).trim();
  const dash = target.indexOf('-');
  const start = parseOsisRef(dash === -1 ? target : target.slice(0, dash));
  if (!start) return null;
  let end = null;
  if (dash !== -1) {
    const parsed = parseOsisRef(target.slice(dash + 1));
    if (parsed && parsed.code === start.code) {
      const a = ordinal(start), b = ordinal(parsed);
      if (b > a) end = parsed;
    }
  }
  return { from, start, end, votes };
}

/** Comparable position inside a book; chapters never reach 1000 verses. */
export function ordinal(ref) {
  return ref.c * 1000 + ref.v;
}

// ---------------------------------------------------------------------------
// §1.4 Versification profiles
// ---------------------------------------------------------------------------
//
// `eng` - identity. Proved by scripts/audit-versification.mjs: kjv, asv, web,
//         geneva, coverdale, heilige_schrift_1917, luther_1912,
//         elberfelder_1905 and canisiusbijbel all diff 0-6 chapters against
//         KJV, and every one of those diffs is a missing/merged single verse,
//         never a renumbering.
//
// `heb` - built from the TVTMS "Renumber verse" rows whose SourceType names the
//         Hebrew tradition, inverted (TVTMS lists Hebrew -> English/Standard).
//         No version on disk uses it today; it exists because the dataset is
//         English-numbered and a Hebrew-numbered edition is the obvious next
//         one to add, and because the §7.1 fixtures pin it.
//
// `sv`  - the Dutch tradition shared by `statenvertaling` and `nbg51`. It is
//         NOT a TVTMS column: measured against the real data it differs from
//         TVTMS Hebrew in 73 chapters and from English in 93. It was derived
//         from the versions themselves and every rule below was verified by
//         comparing the Dutch text with the KJV verse it should equal.
//
// `nbg`  - `sv` plus Haggai. nbg51 splits Hag 1:15 (nbg 2:1 = eng 1:15) where
//          the Statenvertaling does not. See lib/crossRefs/versionProfiles.ts.
//
// Rule shape: SEGMENTS[code][englishChapter] = [{ upto, c, d }, ...]
//   English verse v (v <= upto, first match wins) becomes { c, v: v + d }.
// A chapter with no entry maps 1:1.
// ---------------------------------------------------------------------------

const INF = Number.MAX_SAFE_INTEGER;

/**
 * Psalms whose title is numbered in the Dutch tradition, and by how many
 * verses every body verse therefore shifts. Derived from the Statenvertaling
 * data (62 psalms: 58 x +1, 4 x +2) and confirmed verse-for-verse against
 * nbg51, which numbers the same 62 titles.
 */
export const SV_PSALM_TITLE_OFFSET = {
  3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 12: 1, 18: 1, 19: 1, 20: 1, 21: 1,
  22: 1, 30: 1, 31: 1, 34: 1, 36: 1, 38: 1, 39: 1, 40: 1, 41: 1, 42: 1, 44: 1,
  45: 1, 46: 1, 47: 1, 48: 1, 49: 1, 51: 2, 52: 2, 53: 1, 54: 2, 55: 1, 56: 1,
  57: 1, 58: 1, 59: 1, 60: 2, 61: 1, 62: 1, 63: 1, 64: 1, 65: 1, 67: 1, 68: 1,
  69: 1, 70: 1, 75: 1, 76: 1, 77: 1, 80: 1, 81: 1, 83: 1, 84: 1, 85: 1, 88: 1,
  89: 1, 92: 1, 102: 1, 108: 1, 140: 1, 142: 1,
};

/** Chapter-boundary moves shared by statenvertaling and nbg51. */
export const SV_SEGMENTS = {
  // eng Exod 6:1 is the last verse of SV Exodus 5.
  EXOD: { 6: [{ upto: 1, c: 5, d: 23 }, { upto: INF, c: 6, d: -1 }] },
  // eng 1Sam 23:29 opens SV 1 Samuel 24.
  '1SAM': {
    23: [{ upto: 28, c: 23, d: 0 }, { upto: INF, c: 24, d: -28 }],
    24: [{ upto: INF, c: 24, d: 1 }],
  },
  // Job 38-41 are re-partitioned; the verse sequence is identical, the
  // chapter cuts differ. 41+30+24+34 eng verses == 38+38+28+25 SV verses.
  JOB: {
    38: [{ upto: 38, c: 38, d: 0 }, { upto: INF, c: 39, d: -38 }],
    39: [{ upto: INF, c: 39, d: 3 }],
    40: [{ upto: 5, c: 39, d: 33 }, { upto: INF, c: 40, d: -5 }],
    41: [{ upto: 9, c: 40, d: 19 }, { upto: INF, c: 41, d: -9 }],
  },
  // eng Eccl 5:1 is SV Prediker 4:17.
  ECCL: { 5: [{ upto: 1, c: 4, d: 16 }, { upto: INF, c: 5, d: -1 }] },
  // eng Isa 9:1 is SV Jesaja 8:23.
  ISA: { 9: [{ upto: 1, c: 8, d: 22 }, { upto: INF, c: 9, d: -1 }] },
  // eng Dan 5:31 opens SV Daniël 6.
  DAN: {
    5: [{ upto: 30, c: 5, d: 0 }, { upto: INF, c: 6, d: -30 }],
    6: [{ upto: INF, c: 6, d: 1 }],
  },
  HOS: {
    2: [{ upto: 1, c: 1, d: 11 }, { upto: INF, c: 2, d: -1 }],   // eng 2:1 -> 1:12
    11: [{ upto: 11, c: 11, d: 0 }, { upto: INF, c: 12, d: -11 }], // eng 11:12 -> 12:1
    12: [{ upto: INF, c: 12, d: 1 }],
    13: [{ upto: 15, c: 13, d: 0 }, { upto: INF, c: 14, d: -15 }], // eng 13:16 -> 14:1
    14: [{ upto: INF, c: 14, d: 1 }],
  },
  // eng Mic 5:1 is SV Micha 4:14.
  MIC: { 5: [{ upto: 1, c: 4, d: 13 }, { upto: INF, c: 5, d: -1 }] },
  // eng Acts 19:40-41 are one verse in the Dutch text.
  ACTS: { 19: [{ upto: 40, c: 19, d: 0 }, { upto: INF, c: 19, d: -1 }] },
  // eng 2Cor 13:12-13 are one verse; eng 13:14 is Dutch 13:13.
  '2COR': { 13: [{ upto: 12, c: 13, d: 0 }, { upto: INF, c: 13, d: -1 }] },
};

/** nbg51 only: eng Hag 1:15 opens NBG Haggaï 2. */
export const NBG_EXTRA_SEGMENTS = {
  HAG: {
    1: [{ upto: 14, c: 1, d: 0 }, { upto: INF, c: 2, d: -14 }],
    2: [{ upto: INF, c: 2, d: 1 }],
  },
};

/**
 * Build the English -> Hebrew verse map from the TVTMS expanded table.
 * TVTMS columns: SourceType | SourceRef | StandardRef | Action | ...
 * SourceRef is in the source tradition, StandardRef is English/KJV, so the map
 * is inverted here. "Renumber title" rows are skipped: they point at a psalm
 * title, which has no English verse number to key on (the title offset falls
 * out of the "Renumber verse" rows for the body verses anyway).
 */
export function parseTvtmsHebrew(lines) {
  const map = new Map();
  for (const line of lines) {
    if (!line || line.indexOf('\t') === -1) continue;
    const cols = line.split('\t');
    if (cols.length < 4) continue;
    if (!/Hebrew/.test(cols[0])) continue;
    if (cols[3] !== 'Renumber verse') continue;
    const src = parseTvtmsRef(cols[1]);
    const std = parseTvtmsRef(cols[2]);
    if (!src || !std) continue;
    const key = `${std.code}.${std.c}.${std.v}`;
    if (!map.has(key)) map.set(key, { c: src.c, v: src.v });
  }
  return map;
}

const TVTMS_REF_RE = /^([1-5]?[A-Za-z]{2,3})\.(\d+):(\d+)/;

export function parseTvtmsRef(raw) {
  const m = String(raw || '').trim().match(TVTMS_REF_RE);
  if (!m) return null;
  const osis = STEP_TO_OSIS[m[1]];
  if (!osis) return null;
  const code = OSIS_TO_CODE[osis.toUpperCase()];
  if (!code) return null;
  return { code, c: Number(m[2]), v: Number(m[3]) };
}

/** Apply a SEGMENTS table to one English reference. */
function applySegments(segments, ref) {
  const forBook = segments[ref.code];
  const rules = forBook && forBook[ref.c];
  if (!rules) return { c: ref.c, v: ref.v };
  for (const rule of rules) {
    if (ref.v <= rule.upto) return { c: rule.c, v: ref.v + rule.d };
  }
  return { c: ref.c, v: ref.v };
}

/**
 * A mapper takes an English { code, c, v } and returns { c, v } in the
 * profile's numbering, or null when the verse has no counterpart.
 */
export function createMapper(profile, { hebrewMap } = {}) {
  if (profile === 'eng') return (ref) => ({ c: ref.c, v: ref.v });
  if (profile === 'heb') {
    const map = hebrewMap || new Map();
    return (ref) => map.get(`${ref.code}.${ref.c}.${ref.v}`) || { c: ref.c, v: ref.v };
  }
  if (profile === 'sv' || profile === 'nbg') {
    const segments = profile === 'nbg'
      ? { ...SV_SEGMENTS, ...NBG_EXTRA_SEGMENTS }
      : SV_SEGMENTS;
    return (ref) => {
      if (ref.code === 'PS') {
        const offset = SV_PSALM_TITLE_OFFSET[ref.c] || 0;
        return { c: ref.c, v: ref.v + offset };
      }
      return applySegments(segments, ref);
    };
  }
  throw new Error(`Unknown versification profile: ${profile}`);
}

// ---------------------------------------------------------------------------
// §2.3 Pruning
// ---------------------------------------------------------------------------

/**
 * Prune and order the references of ONE source verse. Every ref is already in
 * profile coordinates: { b, c, v, ec, ev, w } with b = canonical book index.
 * Steps, in order: self-reference, ±1 neighbour, duplicate, overlap merge,
 * sort by votes desc (ties by canonical position), keep top N.
 *
 * @param {Array<{b:number,c:number,v:number,ec?:number,ev?:number,w:number}>} refs
 * @param {{b:number,c:number,v:number}} source
 * @param {{ topN?: number, stats?: Record<string, number> }} [options]
 */
export function pruneVerseRefs(refs, source, { topN = TOP_N, stats } = {}) {
  const bump = (k) => { if (stats) stats[k] = (stats[k] || 0) + 1; };
  const kept = [];
  for (const ref of refs) {
    if (ref.b === source.b && ref.c === source.c) {
      const startsAt = ref.v;
      const endsAt = ref.ec && ref.ec !== ref.c ? Infinity : (ref.ev || ref.v);
      if (startsAt <= source.v && source.v <= endsAt) { bump('droppedSelf'); continue; }
      if (Math.abs(startsAt - source.v) <= 1 && !ref.ec) { bump('droppedNeighbour'); continue; }
    }
    kept.push(ref);
  }

  // Duplicates: identical target span, keep the highest vote count.
  const byKey = new Map();
  for (const ref of kept) {
    const key = `${ref.b}.${ref.c}.${ref.v}.${ref.ec || 0}.${ref.ev || 0}`;
    const existing = byKey.get(key);
    if (existing) {
      bump('droppedDuplicate');
      if (ref.w > existing.w) existing.w = ref.w;
    } else {
      byKey.set(key, { ...ref });
    }
  }

  // Merge overlapping ranges inside the same target book.
  const ordered = [...byKey.values()].sort(comparePosition);
  const merged = [];
  for (const ref of ordered) {
    const prev = merged[merged.length - 1];
    if (prev && prev.b === ref.b) {
      const prevEnd = (prev.ec || prev.c) * 1000 + (prev.ev || prev.v);
      const start = ref.c * 1000 + ref.v;
      if (start <= prevEnd) {
        bump('mergedRanges');
        const end = (ref.ec || ref.c) * 1000 + (ref.ev || ref.v);
        if (end > prevEnd) {
          prev.ec = ref.ec || ref.c;
          prev.ev = ref.ev || ref.v;
          if (prev.ec === prev.c && prev.ev === prev.v) { prev.ec = 0; prev.ev = 0; }
        }
        prev.w = Math.max(prev.w, ref.w);
        continue;
      }
    }
    merged.push(ref);
  }

  merged.sort((a, b) => (b.w - a.w) || comparePosition(a, b));
  if (merged.length > topN) {
    if (stats) stats.droppedTopN = (stats.droppedTopN || 0) + (merged.length - topN);
    merged.length = topN;
  }
  return merged;
}

function comparePosition(a, b) {
  return (a.b - b.b) || (a.c - b.c) || (a.v - b.v)
    || ((a.ec || a.c) - (b.ec || b.c)) || ((a.ev || a.v) - (b.ev || b.v));
}

/** §2.1 tuple: [bookIdx, chapter, verse, endVerse|0, votes, endChapter?] */
export function encodeTuple(ref) {
  const tuple = [ref.b, ref.c, ref.v, ref.ev || 0, ref.w];
  if (ref.ec && ref.ec !== ref.c) tuple.push(ref.ec);
  return tuple;
}

// ---------------------------------------------------------------------------
// The pure transform (imported by tests/crossRefsBuild.test.ts)
// ---------------------------------------------------------------------------

/**
 * rows      - iterable of parsed rows (see parseRow), English numbering
 * mapper    - from createMapper()
 * counts    - { CODE: { chapter: verseCount } } for the profile; a mapped
 *             target outside it is dropped and counted (§1.4 step 5). Pass
 *             null to skip the existence check.
 * Returns { shards, stats }.
 *   shards: Map "CODE/chapter" -> { v, p, b, c, r: { verse: tuple[] } }
 */
export function buildProfile(rows, { profile, mapper, counts, minVotes = MIN_VOTES, topN = TOP_N }) {
  const stats = {
    rowsIn: 0, droppedLowVotes: 0, droppedSourceMissing: 0, droppedTargetMissing: 0,
    droppedSelf: 0, droppedNeighbour: 0, droppedDuplicate: 0, mergedRanges: 0,
    droppedTopN: 0, refsOut: 0, sourceVerses: 0, shards: 0,
  };
  const exists = (code, c, v) => {
    if (!counts) return true;
    const book = counts[code];
    if (!book) return false;
    const n = book[c];
    return typeof n === 'number' && v >= 1 && v <= n;
  };

  // grouped["CODE/chapter"][verse] = [ref, ...]
  const grouped = new Map();

  for (const row of rows) {
    stats.rowsIn++;
    if (row.votes < minVotes) { stats.droppedLowVotes++; continue; }

    const src = mapper(row.from);
    if (!src || !exists(row.from.code, src.c, src.v)) { stats.droppedSourceMissing++; continue; }

    const start = mapper(row.start);
    if (!start || !exists(row.start.code, start.c, start.v)) { stats.droppedTargetMissing++; continue; }

    let ec = 0, ev = 0;
    if (row.end) {
      const end = mapper(row.end);
      if (end && (end.c > start.c || (end.c === start.c && end.v > start.v))) {
        ev = end.v;
        if (end.c !== start.c) ec = end.c;
      }
    }

    const key = `${row.from.code}/${src.c}`;
    let byVerse = grouped.get(key);
    if (!byVerse) { byVerse = new Map(); grouped.set(key, byVerse); }
    let list = byVerse.get(src.v);
    if (!list) { list = []; byVerse.set(src.v, list); }
    list.push({
      b: CODE_TO_INDEX[row.start.code], c: start.c, v: start.v,
      ec, ev, w: row.votes,
      sourceBook: CODE_TO_INDEX[row.from.code],
    });
  }

  const shards = new Map();
  for (const key of [...grouped.keys()].sort(compareShardKey)) {
    const [code, chapterStr] = key.split('/');
    const chapter = Number(chapterStr);
    const byVerse = grouped.get(key);
    const r = {};
    for (const verse of [...byVerse.keys()].sort((a, b) => a - b)) {
      const source = { b: CODE_TO_INDEX[code], c: chapter, v: verse };
      const pruned = pruneVerseRefs(byVerse.get(verse), source, { topN, stats });
      if (!pruned.length) continue;
      r[verse] = pruned.map(encodeTuple);
      stats.refsOut += pruned.length;
      stats.sourceVerses++;
    }
    if (!Object.keys(r).length) continue;
    shards.set(key, { v: SHARD_VERSION, p: profile, b: code, c: chapter, r });
    stats.shards++;
  }
  return { shards, stats };
}

function compareShardKey(a, b) {
  const [ca, na] = a.split('/');
  const [cb, nb] = b.split('/');
  return (CODE_TO_INDEX[ca] - CODE_TO_INDEX[cb]) || (Number(na) - Number(nb));
}

// ---------------------------------------------------------------------------
// Verse-count tables for the existence check (§1.4 step 5)
// ---------------------------------------------------------------------------

/** { CODE: { chapter: verseCount } } from the audit script's reader. */
function countsFromVersion(readVersionCounts, name, label) {
  const res = readVersionCounts(name);
  if (!res) throw new Error(`Cannot build counts for ${label}: ${name} not found on disk`);
  const out = {};
  for (const [code, chapters] of Object.entries(res.counts)) {
    const book = (out[code] = {});
    for (const [ch, info] of Object.entries(chapters)) book[Number(ch)] = info.max;
  }
  return out;
}

/** Project English counts through a mapper (used for `heb`, which has no version on disk). */
export function projectCounts(engCounts, mapper) {
  const out = {};
  for (const [code, chapters] of Object.entries(engCounts)) {
    const book = (out[code] = {});
    for (const [chStr, max] of Object.entries(chapters)) {
      const c = Number(chStr);
      for (let v = 1; v <= max; v++) {
        const m = mapper({ code, c, v });
        if (!m) continue;
        book[m.c] = Math.max(book[m.c] || 0, m.v);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const CACHE = path.join(ROOT, 'scripts', '.cache');
const SRC_CROSSREFS = process.env.CROSSREF_SRC || path.join(CACHE, 'cross_references.txt');
const SRC_TVTMS = process.env.TVTMS_SRC || path.join(CACHE, 'tvtms.txt');

async function* readRows(file) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; if (/^From Verse/i.test(line)) continue; }
    if (!line.trim()) continue;
    yield line;
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function rmDirIfPresent(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const dryRun = argv.includes('--dry-run');
  const outArg = (argv.find((a) => a.startsWith('--out=')) || '').split('=')[1];
  const OUT = path.resolve(ROOT, outArg || `public/data/crossrefs/v${DATASET_VERSION}`);

  for (const f of [SRC_CROSSREFS, SRC_TVTMS]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing source file: ${f}`);
      console.error('Download it into scripts/.cache/ first (see the header of this file).');
      process.exit(1);
    }
  }
  if (fs.existsSync(OUT) && !force && !dryRun) {
    console.error(`${path.relative(ROOT, OUT)} already exists.`);
    console.error('Cross-ref data is versioned by path: bump v1 -> v2, or pass --force to rebuild in place.');
    process.exit(1);
  }

  const srcSha = sha256(SRC_CROSSREFS);
  console.log(`source : ${path.relative(ROOT, SRC_CROSSREFS)}`);
  console.log(`sha256 : ${srcSha}`);
  console.log(`zip    : ${SOURCE_ZIP_SHA256} (${SOURCE_URL})`);
  console.log('');

  // --- parse the source once, keep it in memory (≈345k small objects) -------
  console.log('Reading cross references...');
  const rows = [];
  let malformed = 0;
  for await (const line of readRows(SRC_CROSSREFS)) {
    const row = parseRow(line);
    if (!row) { malformed++; continue; }
    rows.push(row);
  }
  console.log(`  ${rows.length.toLocaleString('en-US')} rows parsed, ${malformed} malformed/skipped`);

  // --- versification tables -------------------------------------------------
  console.log('Reading TVTMS...');
  const tvtmsLines = fs.readFileSync(SRC_TVTMS, 'utf8').split(/\r?\n/);
  const hebrewMap = parseTvtmsHebrew(tvtmsLines);
  console.log(`  ${hebrewMap.size.toLocaleString('en-US')} English -> Hebrew verse renumberings`);

  const read = (name) => readVersionCounts(name);

  const engCounts = countsFromVersion(read, 'kjv', 'eng');
  const svCounts = countsFromVersion(read, 'statenvertaling', 'sv');
  let nbgCounts = null;
  try { nbgCounts = countsFromVersion(read, 'nbg51.json', 'nbg'); }
  catch { console.warn('  nbg51 not on disk - `nbg` profile falls back to projected counts'); }

  // `nbg` is built only on request: it differs from `sv` in Haggai alone and a
  // fourth full shard set costs ~4.7 MB / 1,189 files for two chapters. See
  // lib/crossRefs/versionProfiles.ts.
  const profilesArg = (argv.find((a) => a.startsWith('--profiles=')) || '').split('=')[1];
  const PROFILES = profilesArg ? profilesArg.split(',').map((s) => s.trim()).filter(Boolean)
                               : ['eng', 'heb', 'sv'];
  const mappers = Object.fromEntries(PROFILES.map((p) => [p, createMapper(p, { hebrewMap })]));
  const countsByProfile = {
    eng: engCounts,
    heb: projectCounts(engCounts, mappers.heb),
    sv: svCounts,
    nbg: nbgCounts || projectCounts(engCounts, mappers.nbg),
  };

  // --- build ----------------------------------------------------------------
  if (!dryRun) { rmDirIfPresent(OUT); fs.mkdirSync(OUT, { recursive: true }); }

  const index = {
    datasetVersion: DATASET_VERSION,
    source: 'OpenBible.info Cross References',
    sourceId: 'openbible',
    sourceUrl: SOURCE_URL,
    sourceSha256: srcSha,
    sourceZipSha256: SOURCE_ZIP_SHA256,
    sourceDate: DATASET_DATE,
    builtAt: `${DATASET_DATE}T00:00:00.000Z`,
    minVotes: MIN_VOTES,
    topN: TOP_N,
    attribution: ATTRIBUTION,
    profiles: PROFILES,
    counts: {
      rawRows: rows.length,
      malformedRows: malformed,
      droppedLowVotes: 0,
    },
  };
  const report = {};

  for (const profile of PROFILES) {
    console.log('');
    console.log(`--- profile ${profile} ---`);
    const { shards, stats } = buildProfile(rows, {
      profile,
      mapper: mappers[profile],
      counts: countsByProfile[profile],
    });

    let bytes = 0, files = 0, largest = { key: null, bytes: 0 };
    for (const [key, shard] of shards) {
      const json = JSON.stringify(shard);
      bytes += Buffer.byteLength(json);
      files++;
      if (Buffer.byteLength(json) > largest.bytes) largest = { key, bytes: Buffer.byteLength(json) };
      if (dryRun) continue;
      const [code, chapter] = key.split('/');
      const dir = path.join(OUT, profile, code);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${chapter}.json`), json);
    }

    // CrossRefIndex#counts is a flat Record<string, number>.
    // votes < MIN_VOTES is a pre-mapping filter, so it is the same for every
    // profile and is recorded once at the top level.
    index.counts.droppedLowVotes = stats.droppedLowVotes;
    index.counts[`${profile}.refs`] = stats.refsOut;
    index.counts[`${profile}.sourceVerses`] = stats.sourceVerses;
    index.counts[`${profile}.chapters`] = files;
    index.counts[`${profile}.bytes`] = bytes;
    index.counts[`${profile}.droppedTargetMissing`] = stats.droppedTargetMissing;
    index.counts[`${profile}.droppedSourceMissing`] = stats.droppedSourceMissing;
    report[profile] = { ...stats, files, bytes, largest };

    console.log(`  rows in                 ${stats.rowsIn.toLocaleString('en-US')}`);
    console.log(`  dropped votes < ${MIN_VOTES}       ${stats.droppedLowVotes.toLocaleString('en-US')}`);
    console.log(`  dropped source missing  ${stats.droppedSourceMissing.toLocaleString('en-US')}`);
    console.log(`  dropped target missing  ${stats.droppedTargetMissing.toLocaleString('en-US')}`);
    console.log(`  dropped self-reference  ${(stats.droppedSelf || 0).toLocaleString('en-US')}`);
    console.log(`  dropped ±1 neighbour    ${(stats.droppedNeighbour || 0).toLocaleString('en-US')}`);
    console.log(`  dropped duplicate       ${(stats.droppedDuplicate || 0).toLocaleString('en-US')}`);
    console.log(`  merged overlapping      ${(stats.mergedRanges || 0).toLocaleString('en-US')}`);
    console.log(`  dropped beyond top ${TOP_N}   ${(stats.droppedTopN || 0).toLocaleString('en-US')}`);
    console.log(`  refs out                ${stats.refsOut.toLocaleString('en-US')} over ${stats.sourceVerses.toLocaleString('en-US')} source verses`);
    console.log(`  files                   ${files.toLocaleString('en-US')}  (${fmtBytes(bytes)})`);
    console.log(`  largest shard           ${largest.key} = ${fmtBytes(largest.bytes)}`);
  }

  if (!dryRun) {
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  }

  const totalFiles = Object.values(report).reduce((s, r) => s + r.files, 0);
  const totalBytes = Object.values(report).reduce((s, r) => s + r.bytes, 0);
  const totalRefs = Object.values(report).reduce((s, r) => s + r.refsOut, 0);
  console.log('');
  console.log('='.repeat(64));
  console.log(`TOTAL: ${totalRefs.toLocaleString('en-US')} refs, ${totalFiles.toLocaleString('en-US')} shard files + index.json, ${fmtBytes(totalBytes)}`);
  console.log(`Output: ${path.relative(ROOT, OUT)}${dryRun ? ' (dry run - nothing written)' : ''}`);
  console.log('='.repeat(64));
}

if (process.argv[1]?.endsWith('build-crossrefs.mjs')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
