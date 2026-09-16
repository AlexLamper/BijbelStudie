/**
 * The palette's "Recent" list: the ids of the last commands the reader ran,
 * most recent first, in this browser only. Storage is injectable so the tests
 * run in node, and every access is wrapped - storage can be missing, full or
 * blocked (private windows, site data off).
 */

export const RECENTS_KEY = "bijbelstudie_command_recents";
export const MAX_RECENTS = 6;

export interface RecentsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): RecentsStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Read the stored ids. `isKnown` prunes ids that no longer exist or are not
 * visible to this reader right now.
 */
export function loadRecents(
  isKnown: (id: string) => boolean = () => true,
  storage: RecentsStorage | null = defaultStorage()
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v !== "string" || seen.has(v) || !isKnown(v)) continue;
      seen.add(v);
      out.push(v);
      if (out.length >= MAX_RECENTS) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Move `id` to the front and store the list. Returns the new list. */
export function pushRecent(id: string, storage: RecentsStorage | null = defaultStorage()): string[] {
  const current = loadRecents(() => true, storage).filter((v) => v !== id);
  const next = [id, ...current].slice(0, MAX_RECENTS);
  if (storage) {
    try {
      storage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* quota or blocked storage: the list simply is not remembered */
    }
  }
  return next;
}
