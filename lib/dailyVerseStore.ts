/**
 * What the "Tekst van de dag" card remembers, on this device only.
 *
 * `GET /api/bible/daytext` serves one verse and nothing else - no archive, no
 * per-user state - so the heart and "Bekijk voorgaande dagen" are backed by
 * localStorage, exactly as the mobile card backs them with SharedPreferences
 * (`lib/features/dashboard/data/daily_verse_store.dart`). Keeping the two
 * stores parallel means the two cards behave the same even though neither
 * knows about the other.
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
};

const HISTORY_KEY = 'bijbelstudie_daytext_history';
const LIKES_KEY = 'bijbelstudie_daytext_likes';

/** Roughly two months of verses. Beyond that nobody scrolls. */
const MAX_HISTORY = 60;

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

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
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
