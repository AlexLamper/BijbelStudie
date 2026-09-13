/**
 * The verse of the day, shared by the website's `/api/bible/daytext` shape and
 * the mobile `/api/v1/daytext` route.
 *
 * Upstream is a third-party service, so every caller treats a failure as "no
 * verse today" rather than an error - the dashboard must still render.
 */

import { unstable_cache } from 'next/cache';
import {
  DAYTEXT_DEFAULT_VERSION,
  resolveDayTextVersion,
  verseFromChapter,
  withDayTextVersion,
  type DayTextInVersion,
} from './dailyVerseTranslation';

export type DayText = {
  text: string;
  reference: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
};

/**
 * The Amsterdam calendar day, `yyyy-mm-dd` - the archive's key.
 *
 * Fixed to the app's own timezone rather than the server's: Vercel runs in UTC,
 * so a verse served at 01:00 Dutch time would otherwise be filed under
 * yesterday.
 */
export function dayKeyNL(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Files today's verse in the shared archive, once per day.
 *
 * Best effort on purpose: this runs on the read path of a public endpoint, and
 * a database that is slow or down must not turn "today's verse" into an error.
 */
export async function recordDayText(verse: DayText, date = dayKeyNL()): Promise<void> {
  try {
    // Upstream sends English book names ("Ecclesiastes"); the archive is read
    // by Dutch-only clients that link straight to /lezen, so it is stored
    // canonical - the same normalisation `/api/bible/daytext` does inline.
    const { CANONICAL_NL } = await import('./book-mapping');
    const book = CANONICAL_NL[verse.book] ?? verse.book;
    const entry: DayText = {
      ...verse,
      book,
      reference: `${book} ${verse.chapter}:${verse.verse}`,
    };
    const [{ default: connectMongoDB }, { default: DayTextEntry }] = await Promise.all([
      import('./mongodb'),
      import('../models/DayTextEntry'),
    ]);
    await connectMongoDB();
    await DayTextEntry.updateOne(
      { date },
      { $setOnInsert: { date, ...entry } },
      { upsert: true },
    );
  } catch {
    // No archive entry for today. The card still renders.
  }
}

/** The archive, newest day first. Empty when nothing has been recorded yet. */
export async function readDayTextHistory(limit = 60): Promise<(DayText & { date: string })[]> {
  try {
    const [{ default: connectMongoDB }, { default: DayTextEntry }] = await Promise.all([
      import('./mongodb'),
      import('../models/DayTextEntry'),
    ]);
    await connectMongoDB();
    const rows = await DayTextEntry.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .sort({ date: -1 })
      .limit(Math.min(Math.max(limit, 1), 120))
      .lean();
    return rows as unknown as (DayText & { date: string })[];
  } catch {
    return [];
  }
}

/**
 * One verse's text in one translation, cached across instances.
 *
 * A (translation, book, chapter, verse) text never changes, so the Data Cache
 * entry is safe for a week; the args are part of the key, so translations can
 * never bleed into each other. This matters for CPU: NBG51 is a single-file
 * source, and a cold instance would otherwise re-parse the whole translation
 * just to read one verse. A miss THROWS so it is not cached - a chapter that is
 * "not synced yet" must not stay missing for a week.
 */
const cachedVerseText = unstable_cache(
  async (versionId: string, book: string, chapter: number, verse: number): Promise<string> => {
    const [{ getChapter }, { CANONICAL_NL }] = await Promise.all([
      import('./local-data'),
      import('./book-mapping'),
    ]);
    // Upstream's English name first, then the canonical Dutch one; getChapter
    // tries each name's own variants as well.
    const names = Array.from(new Set([book, CANONICAL_NL[book]].filter(Boolean) as string[]));
    for (const name of names) {
      const data = await getChapter(versionId, name, chapter);
      const text = verseFromChapter(data?.verses, verse);
      if (text) return text;
    }
    throw new Error('DAYTEXT_VERSE_MISSING');
  },
  ['daytext-verse-text-v1'],
  { revalidate: 604_800 },
);

/**
 * Today's verse in the translation the reader asked for.
 *
 * `requested` goes through the licensing allowlist first; anything not on it,
 * and any verse the translation does not have, returns the Statenvertaling
 * original. Never throws - the card must render.
 */
export async function dayTextInVersion(
  base: DayText,
  requested: string | null | undefined,
): Promise<DayTextInVersion> {
  const versionId = resolveDayTextVersion(requested);
  if (versionId === DAYTEXT_DEFAULT_VERSION) {
    return withDayTextVersion(base, versionId, null);
  }
  try {
    const text = await cachedVerseText(versionId, base.book, base.chapter, base.verse);
    return withDayTextVersion(base, versionId, text);
  } catch {
    return withDayTextVersion(base, versionId, null);
  }
}

export async function fetchDayText(): Promise<DayText | null> {
  const res = await fetch('https://bijbelapi.com/api/daytext?version=sv', {
    next: { revalidate: 86400 }, // one verse per day
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.text) return null;

  const verse: DayText = {
    text: data.text,
    reference: `${data.book} ${data.chapter}:${data.verse}`,
    version: 'Statenvertaling',
    book: data.book,
    chapter: Number(data.chapter),
    verse: Number(data.verse),
  };

  await recordDayText(verse);
  return verse;
}
