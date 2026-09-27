"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_PROGRESS,
  parseProgress,
  withBookmarkToggled,
  withOpened,
  withRead,
  type BronProgressState,
} from "../../lib/content/bronnen/progress";

/**
 * The browser side of Bronnen reading progress (lib/content/bronnen/progress.ts)
 * plus the reader's small preferences. Everything lives in localStorage: the
 * Bronnen pages are prerendered, so nothing here asks the server anything.
 *
 * Every key is read through one useSyncExternalStore store, so a change made
 * in the reader shows at once in the rail and, via the `storage` event, in
 * other tabs. The server snapshot is always the empty value: the static HTML
 * renders "nothing read yet" and the browser fills in the reader's own state.
 * Storage can be blocked (private windows, previews); writes then live in
 * memory for the page's lifetime and nothing throws.
 */

const PROGRESS_KEY = "bronnen-progress-v1";

const listeners = new Set<() => void>();
const memory = new Map<string, string>();
const parsedCache = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key == null || e.key.startsWith("bronnen-")) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** A parsed value per key, re-parsed only when the stored string changes. */
function snapshot<T>(key: string, parse: (raw: string | null) => T): T {
  const raw = readRaw(key);
  const hit = parsedCache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = parse(raw);
  parsedCache.set(key, { raw, value });
  return value;
}

const progressSnapshot = () => snapshot(PROGRESS_KEY, parseProgress);
const emptyProgress = () => EMPTY_PROGRESS;

export function useBronProgress(): BronProgressState {
  return useSyncExternalStore(subscribe, progressSnapshot, emptyProgress);
}

function updateProgress(fn: (state: BronProgressState) => BronProgressState) {
  const current = progressSnapshot();
  const next = fn(current);
  if (next !== current) writeRaw(PROGRESS_KEY, JSON.stringify(next));
}

export function markOpened(slug: string, id: string) {
  updateProgress(state => withOpened(state, slug, id, Date.now()));
}

export function markRead(slug: string, id: string) {
  updateProgress(state => withRead(state, slug, id));
}

export function toggleBookmark(slug: string, id: string) {
  updateProgress(state => withBookmarkToggled(state, slug, id, Date.now()));
}

/**
 * One string preference ("md", "1", a note's text) under its own key. The
 * server and first client render see `fallback`.
 */
export function useBronPref(key: string, fallback: string): [string, (value: string) => void] {
  const fullKey = `bronnen-${key}`;
  const value = useSyncExternalStore(
    subscribe,
    () => readRaw(fullKey) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: string) => writeRaw(fullKey, next), [fullKey]);
  return [value, set];
}
