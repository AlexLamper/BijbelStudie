/**
 * Reading progress in the Bronnen library: which sections a reader has read,
 * where they were last, and what they bookmarked. Pure - the browser store in
 * components/bronnen/useBronProgress.ts persists it, and the three Bronnen
 * pages all derive their numbers from these functions, so they always agree.
 *
 * A section counts as read once it has been opened AND scrolled to the end.
 * Progress is kept per browser (the pages are prerendered and never ask the
 * server who is reading); section ids are stable forever (see ./types.ts), so
 * stored ids never go stale.
 */

export interface BronPlace {
  slug: string;
  id: string;
  at: number;
}

export interface BronProgressState {
  /** slug -> ids of the sections read to the end. */
  read: Record<string, string[]>;
  /** slug -> the section opened last in that work. */
  last: Record<string, { id: string; at: number }>;
  bookmarks: BronPlace[];
}

export const EMPTY_PROGRESS: BronProgressState = Object.freeze({
  read: Object.freeze({}) as Record<string, string[]>,
  last: Object.freeze({}) as Record<string, { id: string; at: number }>,
  bookmarks: Object.freeze([]) as unknown as BronPlace[],
}) as BronProgressState;

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length < 200;

/** Tolerant parse of the stored JSON: anything malformed is dropped, never thrown. */
export function parseProgress(raw: string | null): BronProgressState {
  if (!raw) return EMPTY_PROGRESS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (!data || typeof data !== "object") return EMPTY_PROGRESS;
  const src = data as Record<string, unknown>;
  const read: Record<string, string[]> = {};
  if (src.read && typeof src.read === "object") {
    for (const [slug, ids] of Object.entries(src.read as Record<string, unknown>)) {
      if (isStr(slug) && Array.isArray(ids)) read[slug] = [...new Set(ids.filter(isStr))];
    }
  }
  const last: Record<string, { id: string; at: number }> = {};
  if (src.last && typeof src.last === "object") {
    for (const [slug, v] of Object.entries(src.last as Record<string, unknown>)) {
      const place = v as { id?: unknown; at?: unknown } | null;
      if (isStr(slug) && place && isStr(place.id) && typeof place.at === "number") {
        last[slug] = { id: place.id, at: place.at };
      }
    }
  }
  const bookmarks: BronPlace[] = [];
  if (Array.isArray(src.bookmarks)) {
    for (const v of src.bookmarks) {
      const b = v as Partial<BronPlace> | null;
      if (b && isStr(b.slug) && isStr(b.id) && typeof b.at === "number") bookmarks.push({ slug: b.slug, id: b.id, at: b.at });
    }
  }
  return { read, last, bookmarks };
}

export function isRead(state: BronProgressState, slug: string, id: string): boolean {
  return state.read[slug]?.includes(id) ?? false;
}

/** Sections of `ids` read to the end; stray stored ids are not counted. */
export function readCount(state: BronProgressState, slug: string, ids: readonly string[]): number {
  const read = state.read[slug];
  if (!read || read.length === 0) return 0;
  const set = new Set(read);
  return ids.reduce((n, id) => n + (set.has(id) ? 1 : 0), 0);
}

/**
 * Where "Verder lezen" takes a reader in one work:
 * - the section opened last, when it was not finished;
 * - otherwise the first unread section after it (wrapping round);
 * - never opened but some read: the first unread section;
 * - nothing read: the first section, with `started: false` ("Begin met lezen").
 * Null when every section is read.
 */
export function continueTarget(
  state: BronProgressState,
  slug: string,
  ids: readonly string[],
): { id: string; started: boolean } | null {
  if (ids.length === 0) return null;
  const read = new Set(state.read[slug] ?? []);
  if (ids.every(id => read.has(id))) return null;
  const lastId = state.last[slug]?.id;
  const lastIndex = lastId ? ids.indexOf(lastId) : -1;
  if (lastIndex >= 0) {
    if (!read.has(ids[lastIndex])) return { id: ids[lastIndex], started: true };
    for (let step = 1; step < ids.length; step++) {
      const id = ids[(lastIndex + step) % ids.length];
      if (!read.has(id)) return { id, started: true };
    }
  }
  const firstUnread = ids.find(id => !read.has(id))!;
  return { id: firstUnread, started: ids.some(id => read.has(id)) };
}

/** The section opened most recently across all works. */
export function latestPlace(state: BronProgressState): BronPlace | null {
  let best: BronPlace | null = null;
  for (const [slug, place] of Object.entries(state.last)) {
    if (!best || place.at > best.at) best = { slug, id: place.id, at: place.at };
  }
  return best;
}

export function withOpened(state: BronProgressState, slug: string, id: string, at: number): BronProgressState {
  return { ...state, last: { ...state.last, [slug]: { id, at } } };
}

export function withRead(state: BronProgressState, slug: string, id: string): BronProgressState {
  if (isRead(state, slug, id)) return state;
  return { ...state, read: { ...state.read, [slug]: [...(state.read[slug] ?? []), id] } };
}

export function isBookmarked(state: BronProgressState, slug: string, id: string): boolean {
  return state.bookmarks.some(b => b.slug === slug && b.id === id);
}

export function withBookmarkToggled(state: BronProgressState, slug: string, id: string, at: number): BronProgressState {
  const bookmarks = isBookmarked(state, slug, id)
    ? state.bookmarks.filter(b => !(b.slug === slug && b.id === id))
    : [{ slug, id, at }, ...state.bookmarks];
  return { ...state, bookmarks };
}

/**
 * The Heidelberg zondag for a date: the ISO week number, the usual way the
 * 52 zondagen are spread over a year. Week 53 falls back to zondag 52.
 */
export function zondagForDate(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return Math.min(52, Math.max(1, week));
}
