/**
 * What the "Tekst van de dag" card remembers, on this device, plus the merge
 * with the shared archive.
 *
 * `GET /api/bible/daytext` serves one verse and nothing else, so the heart and
 * the device's own record of each day are backed by localStorage, exactly as
 * the mobile card backs them with SharedPreferences
 * (`lib/features/dashboard/data/daily_verse_store.dart`). "Bekijk voorgaande
 * dagen" also reads the shared server archive (`GET /api/v1/daytext/history`,
 * the route the app uses too) and folds it in with `previousDays` - without it
 * a browser only ever knew the days it happened to be opened on, which on a
 * fresh browser is just today.
 *
 * Everything here tolerates localStorage being unavailable or corrupt: a
 * private window, cleared site data, or a browser refusing storage. The card
 * must still render today's verse in that case; it simply forgets.
 */

export type StoredVerse = {
  /** `yyyy-mm-dd` of the day it was shown. One entry per day. */
  date: string;
  text: string;
  reference: string;
  book: string;
  chapter: number;
  verse?: number;
  /** Abbreviation as printed after the reference, e.g. "SV". */
  version: string;
  /** Translation id the text is in, e.g. "nbg51". Absent on older entries. */
  versionId?: string;
};

const HISTORY_KEY = 'bijbelstudie_daytext_history';
const LIKES_KEY = 'bijbelstudie_daytext_likes';

/** Roughly two months of verses. Beyond that nobody scrolls. */
const MAX_HISTORY = 60;

/** A day as both stores key it. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota, or storage blocked. Forgetting is an acceptable outcome here.
  }
}

/** The device's own calendar day, `yyyy-mm-dd`. */
export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * The Amsterdam calendar day, `yyyy-mm-dd` - the day the verse belongs to.
 *
 * The verse changes at Amsterdam midnight and the server files its archive
 * under this key (`dayKeyNL` in `lib/mobileDayText.ts`, which cannot be
 * imported here: it pulls in `next/cache` and the database). Keying the
 * device's copy on the browser's own day instead would, for a reader outside
 * the Netherlands, file one day's verse under the neighbouring date and put
 * two different verses on one day once the two lists are merged.
 *
 * Built from parts rather than from a locale's formatted string, so no
 * browser's idea of "en-CA" can change the shape. Falls back to the device's
 * day where the timezone database is missing.
 */
export function dayKeyNL(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const key = `${part('year')}-${part('month')}-${part('day')}`;
    if (DAY_KEY.test(key)) return key;
  } catch {
    // No tz data, or an invalid date: the device's own day will do.
  }
  return todayKey(date);
}

/** The archive, newest day first. */
export function readHistory(): StoredVerse[] {
  return read<StoredVerse[]>(HISTORY_KEY, []).filter(
    (entry) => typeof entry?.reference === 'string' && typeof entry?.text === 'string',
  );
}

/**
 * Records today's verse, once per day.
 *
 * Keyed on the date rather than the reference, so a feed that repeats a verse
 * months later still gets its own entry, and reopening the dashboard five
 * times in one day does not create five.
 */
export function rememberVerse(entry: StoredVerse): StoredVerse[] {
  const history = readHistory();
  const withoutToday = history.filter((item) => item.date !== entry.date);
  const next = [entry, ...withoutToday].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

/** How many earlier days "Voorgaande dagen" lists. A month is plenty to scroll. */
export const PREVIOUS_DAYS_SHOWN = 30;

/**
 * One row of `GET /api/v1/daytext/history` as a stored day, or null when the
 * row is unusable.
 *
 * The archive is filed in the Statenvertaling (`recordDayText`), whose name it
 * carries in full ("Statenvertaling"; rows from before the field existed carry
 * ""). It is labelled the way the device's own entries are - the abbreviation,
 * "SV" - and linked to the reader in that translation. A row naming any other
 * translation is dropped rather than shown: this card would have no licence
 * notice to print with it.
 */
export function fromArchiveEntry(raw: unknown): StoredVerse | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.date !== 'string' || !DAY_KEY.test(row.date)) return null;
  if (typeof row.text !== 'string' || !row.text.trim()) return null;
  if (typeof row.reference !== 'string' || !row.reference.trim()) return null;
  if (typeof row.book !== 'string' || !row.book.trim()) return null;
  const chapter = Number(row.chapter);
  if (!Number.isInteger(chapter) || chapter < 1) return null;

  const abbreviation = versionAbbreviation(typeof row.version === 'string' ? row.version : '');
  if (abbreviation && abbreviation !== 'SV') return null;

  const verse = Number(row.verse);
  return {
    date: row.date,
    text: row.text,
    reference: row.reference,
    book: row.book,
    chapter,
    ...(Number.isInteger(verse) && verse > 0 ? { verse } : {}),
    version: 'SV',
    versionId: 'statenvertaling',
  };
}

/** The `{ entries }` body of `GET /api/v1/daytext/history`, as stored days. */
export function parseDayTextArchive(body: unknown): StoredVerse[] {
  const entries =
    body && typeof body === 'object' ? (body as { entries?: unknown }).entries : undefined;
  if (!Array.isArray(entries)) return [];
  return entries
    .map(fromArchiveEntry)
    .filter((entry): entry is StoredVerse => entry !== null);
}

/**
 * What "Voorgaande dagen" lists: the device's days and the shared archive's,
 * one per date, strictly before `today`, newest first, at most `limit`.
 *
 * Today is left out - it is on the card already, and a list called "earlier
 * days" that opens with today reads as if nothing earlier exists. So is any
 * date after it (a day filed under the device's own clock, ahead of
 * Amsterdam's). On a clash the device's copy wins, as in the app's
 * `mergeServer`: it is the verse the reader actually saw, in the translation
 * they were reading.
 */
export function previousDays(
  local: readonly StoredVerse[],
  archive: readonly StoredVerse[],
  today: string,
  limit = PREVIOUS_DAYS_SHOWN,
): StoredVerse[] {
  const byDate = new Map<string, StoredVerse>();
  for (const entry of archive) byDate.set(entry.date, entry);
  for (const entry of local) byDate.set(entry.date, entry);
  return Array.from(byDate.values())
    .filter((entry) => typeof entry.date === 'string' && DAY_KEY.test(entry.date) && entry.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, Math.max(0, limit));
}

export const READER_VERSION_KEY = 'bijbelstudie_reader_version';

/**
 * The translation last picked in the reader on this device, and when.
 *
 * The reader posts last-read on a 1.5 s debounce that is cancelled when it
 * unmounts, so the account copy can lag behind a switch made just before going
 * back to the dashboard. The dashboard compares this stamp with the server's
 * `lastReadChapter.updatedAt` (see `pickDashboardVersion`), so the newer of the
 * two wins and a switch on another device is not overridden.
 */
export function rememberReaderVersion(id: string, at = Date.now()): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    window.localStorage.setItem(READER_VERSION_KEY, JSON.stringify({ id, at }));
  } catch {
    // Storage blocked: the account copy answers instead.
  }
}

export function readReaderVersion(): { id: string; at: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(READER_VERSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof parsed?.id !== 'string' || typeof parsed?.at !== 'number') return null;
    return { id: parsed.id, at: parsed.at };
  } catch {
    return null;
  }
}

export function readLikes(): string[] {
  return read<string[]>(LIKES_KEY, []).filter((r) => typeof r === 'string');
}

export function isLiked(reference: string, likes = readLikes()): boolean {
  return likes.includes(reference);
}

/** Adds or removes a reference, returning the new list. */
export function toggleLike(reference: string): string[] {
  const likes = readLikes();
  const next = likes.includes(reference)
    ? likes.filter((r) => r !== reference)
    : [reference, ...likes];
  write(LIKES_KEY, next);
  return next;
}

/**
 * The short label printed after a reference.
 *
 * Mirrors `versionAbbreviation` in the app's `daily_verse_card.dart`. The
 * daytext route sends a display name ("Statenvertaling") rather than an id, so
 * both spellings are accepted; anything unrecognised falls back to capitals,
 * which looks wrong but is never blank.
 */
export function versionAbbreviation(version: string | null | undefined): string {
  const key = (version ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
  const map: Record<string, string> = {
    statenvertaling: 'SV',
    sv: 'SV',
    nbg51: 'NBG51',
    nbgvertaling1951: 'NBG51',
    canisiusbijbel: 'CANIS',
    heiligeschrift1917: 'HS1917',
    herzienestatenvertaling: 'HSV',
    hsv: 'HSV',
    kjv: 'KJV',
    kingjamesversion: 'KJV',
    asv: 'ASV',
    web: 'WEB',
    geneva: 'GNV',
    coverdale: 'CVDL',
    net: 'NET',
  };
  if (!key) return '';
  return map[key] ?? key.toUpperCase();
}

/** "maandag 1 september" for a stored `yyyy-mm-dd`. */
export function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * How many nature photographs ship in `public/images/daytext/` (`001.jpg` ..
 * `365.jpg`) - one for every day of the year, so a date never shares its photo
 * with another date in the same year. Pexels photos under the Pexels License;
 * see `CREDITS.md` beside them. The same files, in the same order, ship in the app's
 * `assets/images/daytext/`.
 */
export const DAILY_VERSE_PHOTO_COUNT = 365;

/**
 * The photo behind the card on a given day.
 *
 * Picked from the calendar day rather than at random, so it is stable across
 * re-renders - the card must not flicker through its backgrounds while the
 * dashboard re-paints - while still changing from one day to the next. Same
 * rule as `dailyVersePhotoAsset` in the app's `daily_verse_photo.dart` (days
 * since 1970-01-01 of the local calendar date, modulo the count), so both
 * surfaces show the same picture on the same day.
 */
export function dailyVersePhoto(date = new Date()): string {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const n = DAILY_VERSE_PHOTO_COUNT;
  const index = ((days % n) + n) % n;
  return `/images/daytext/${String(index + 1).padStart(3, '0')}.jpg`;
}

/**
 * What the card paints behind the verse, in the order of the pages the reader
 * swipes through: the day's photo (the default) and their own Levensboom.
 * The same two, in the same order, as the app's `DailyVerseBackground`.
 */
export const DAILY_VERSE_BACKGROUNDS = ['photo', 'tree'] as const;
export type DailyVerseBackground = (typeof DAILY_VERSE_BACKGROUNDS)[number];

const BACKGROUND_KEY = 'daytext.background';

/** Per account, so two people sharing a browser keep their own choice. */
function backgroundKey(userId: string | null | undefined): string {
  return userId ? `${BACKGROUND_KEY}.${userId}` : BACKGROUND_KEY;
}

/** The reader's chosen background; the photo when nothing (valid) is stored. */
export function readDailyVerseBackground(userId: string | null | undefined): DailyVerseBackground {
  try {
    const stored = window.localStorage.getItem(backgroundKey(userId));
    // 'landscape' was the painted scene the app showed before the photos.
    if (stored === 'tree') return 'tree';
  } catch {
    // No storage: the default, for this visit only.
  }
  return 'photo';
}

export function saveDailyVerseBackground(
  userId: string | null | undefined,
  value: DailyVerseBackground,
): void {
  try {
    window.localStorage.setItem(backgroundKey(userId), value);
  } catch {
    // Kept in memory; the next visit falls back to the default.
  }
}
