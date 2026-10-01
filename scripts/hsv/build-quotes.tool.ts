import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import {
  HSV_ATTRIBUTION,
  HSV_MAX_VERSES,
  HSV_NAME,
  HSV_REFS,
  HSV_VERSION_ID,
  hsvKey,
  hsvQuotaViolations,
} from '../../lib/hsvQuota';

/**
 * `npm run hsv:quotes` - cuts the 50 licensed HSV verses out of the full text
 * and writes them where the product reads them.
 *
 * This is the ONLY path by which HSV text enters this product. The full HSV
 * corpus lives in the private data repo under `archive/bibles/hsv.json` and
 * must stay there: it is neither public domain nor licensed to us. What this
 * tool emits is a 50-verse quotation file, which is what Stichting HSV grants
 * free of charge (see the licence walk-through in lib/hsvQuota.ts).
 *
 * It refuses to write anything that breaks the quota, so the check cannot be
 * skipped by running the generator instead of the test suite.
 *
 * Outputs:
 *   private/data/bibles/hsv-quotes.json                     (local dev)
 *   <data repo>/bijbelstudie/data/bibles/hsv-quotes.json    (commit this one;
 *       scripts/sync-data.mjs mirrors bijbelstudie/** into ./private at build)
 *   lib/data/hsv-allowlist.json                             (totals refreshed)
 *
 * Source override: HSV_SOURCE=/path/to/hsv.json
 */

const ROOT = path.resolve(__dirname, '../..');
const DATA_REPO = process.env.HSV_DATA_REPO ?? path.resolve(ROOT, '../bijbelapi-data');
const SOURCE = process.env.HSV_SOURCE ?? path.join(DATA_REPO, 'archive/bibles/hsv.json');

const OUT_PRIVATE = path.join(ROOT, 'private/data/bibles/hsv-quotes.json');
const OUT_DATA_REPO = path.join(DATA_REPO, 'bijbelstudie/data/bibles/hsv-quotes.json');
const ALLOWLIST = path.join(ROOT, 'lib/data/hsv-allowlist.json');

type Source = {
  books: Record<string, { chapters: Record<string, { verses: Record<string, string> }> }>;
};

/**
 * The source was typeset from print, so it carries the artefacts of a column:
 * runs of spaces where the setter justified a line, and words broken over a
 * line end as `duis- ternis` or `dag- en,`.
 *
 * Joining a broken word is unconditional. Dutch does write a suspended hyphen
 * (`woord- en daaddienst`), which this would wreck - so every verse on the
 * list is read back by eye after a change, and none of the fifty has one.
 */
export function cleanVerse(raw: string): string {
  return raw
    .replace(/ /g, ' ')
    .replace(/(\p{L})-\s+(\p{Ll})/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/**
 * What the scan got wrong, verse by verse, checked by hand against a printed
 * HSV. Quoting a copyrighted translation inaccurately is worse than not
 * quoting it, so each repair states the text it expects to find: if a future
 * source no longer contains it, the generator fails rather than writing a
 * verse nobody looked at.
 *
 *   Exodus 14:14      the emphatic `ú` was scanned as `ü`.
 *   Klaagliederen 3   the acrostic letter headings (`cheth`) ran into the
 *                     verse; in print they stand above it, not inside it.
 *   Mattheüs 28:20    the running head of the next book bled into the last
 *                     verse of Mattheüs.
 *   Johannes 3:16     `zo lief heeft` was scanned as one word.
 */
const REPAIRS: Record<string, [from: string, to: string][]> = {
  'Exodus 14:14': [['en ü moet stil zijn', 'en ú moet stil zijn']],
  'Lamentations 3:22': [['omgekomen zijn, cheth dat', 'omgekomen zijn, dat']],
  'Lamentations 3:23': [['elke morgen; cheth groot', 'elke morgen; groot']],
  'Matthew 28:20': [[
    ' MARKUS Het Evangelie volgens Markus Herziene Statenvertaling Versie',
    '',
  ]],
  'John 3:16': [['Want zo liefheeft God', 'Want zo lief heeft God']],
};

export function repairVerse(key: string, text: string): string {
  let repaired = text;
  for (const [from, to] of REPAIRS[key] ?? []) {
    if (!repaired.includes(from)) {
      throw new Error(`[hsv] ${key}: the source no longer contains "${from}" - recheck by hand.`);
    }
    repaired = repaired.split(from).join(to);
  }
  return repaired.trim();
}

it('writes the HSV quotation file', () => {
  expect(
    existsSync(SOURCE),
    `HSV source not found at ${SOURCE}. Set HSV_SOURCE or HSV_DATA_REPO.`,
  ).toBe(true);

  const source: Source = JSON.parse(readFileSync(SOURCE, 'utf-8'));

  // Totals straight from the source, so the 50% rules are measured against the
  // text we actually quote rather than a remembered number.
  const bookVerseTotals: Record<string, number> = {};
  const chapterVerseTotals: Record<string, number> = {};
  for (const ref of HSV_REFS) {
    const book = source.books[ref.book];
    expect(book, `${ref.book} missing from the HSV source`).toBeTruthy();
    if (bookVerseTotals[ref.book] === undefined) {
      bookVerseTotals[ref.book] = Object.values(book.chapters)
        .reduce((sum, chapter) => sum + Object.keys(chapter.verses).length, 0);
    }
    const chapterKey = `${ref.book} ${ref.chapter}`;
    if (chapterVerseTotals[chapterKey] === undefined) {
      const chapter = book.chapters[String(ref.chapter)];
      expect(chapter, `${chapterKey} missing from the HSV source`).toBeTruthy();
      chapterVerseTotals[chapterKey] = Object.keys(chapter.verses).length;
    }
  }

  const violations = hsvQuotaViolations(HSV_REFS, bookVerseTotals, chapterVerseTotals);
  expect(violations, violations.join('\n')).toEqual([]);
  expect(HSV_REFS.length).toBeLessThanOrEqual(HSV_MAX_VERSES);

  // A repair for a verse that is no longer quoted is dead code pointing at text
  // we no longer ship; it means someone edited one list and not the other.
  const keys = new Set(HSV_REFS.map((ref) => hsvKey(ref.book, ref.chapter, ref.verse)));
  for (const key of Object.keys(REPAIRS)) {
    expect(keys.has(key), `repair for ${key}, which is not on the allowlist`).toBe(true);
  }

  const verses: Record<string, string> = {};
  for (const ref of HSV_REFS) {
    const raw = source.books[ref.book].chapters[String(ref.chapter)].verses[String(ref.verse)];
    expect(raw, `${ref.bookNl} ${ref.chapter}:${ref.verse} missing from the HSV source`)
      .toBeTruthy();
    const text = repairVerse(hsvKey(ref.book, ref.chapter, ref.verse), cleanVerse(raw));
    expect(text.length, `${ref.bookNl} ${ref.chapter}:${ref.verse} is empty after cleaning`)
      .toBeGreaterThan(0);
    verses[hsvKey(ref.book, ref.chapter, ref.verse)] = text;
  }

  expect(Object.keys(verses)).toHaveLength(HSV_REFS.length);

  const payload = {
    _license: [
      'Herziene Statenvertaling. ' + HSV_ATTRIBUTION + '.',
      `Exactly ${HSV_REFS.length} verses - the free-of-charge allowance Stichting HSV grants`,
      'for use of 50 verses or fewer (herzienestatenvertaling.nl, "Gebruik HSV Teksten").',
      'GENERATED by scripts/hsv/build-quotes.tool.ts - do not edit, do not extend by hand.',
      'The full HSV text may not be published, bundled or served; it stays in archive/.',
    ],
    versionId: HSV_VERSION_ID,
    name: HSV_NAME,
    attribution: HSV_ATTRIBUTION,
    maxVerses: HSV_MAX_VERSES,
    verses,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  for (const file of [OUT_PRIVATE, OUT_DATA_REPO]) {
    // The data repo is a sibling checkout; skip it rather than fail when the
    // machine running this only has the web repo.
    if (file === OUT_DATA_REPO && !existsSync(path.join(DATA_REPO, 'bijbelstudie'))) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, json);
    console.log(`[hsv] wrote ${file}`);
  }

  const allowlist = JSON.parse(readFileSync(ALLOWLIST, 'utf-8'));
  allowlist.bookVerseTotals = bookVerseTotals;
  allowlist.chapterVerseTotals = chapterVerseTotals;
  writeFileSync(ALLOWLIST, `${JSON.stringify(allowlist, null, 2)}\n`);

  for (const ref of HSV_REFS) {
    console.log(`${ref.bookNl} ${ref.chapter}:${ref.verse}  ${verses[hsvKey(ref.book, ref.chapter, ref.verse)]}`);
  }
});
