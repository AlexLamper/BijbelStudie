/**
 * Commentaries served from BijbelAPI instead of files in this deployment.
 *
 * Matthew Henry, Dachsel and Calvijn used to ship as JSON under public/data,
 * which Next serves as static files: anyone could download the full text and
 * walk straight past the Pro gate in lib/proContent.ts. The text now lives only
 * in the private bijbelapi-data repo and is fetched per chapter, server-side,
 * with a key that never reaches the browser. The gate still runs in our own
 * API routes on whatever comes back.
 *
 * KingComments is not in this list: it is free for every reader under its own
 * licence, synced from bijbelapi-data into ./private at build and read locally.
 *
 * Server-only. Env:
 *   BIJBELAPI_KEY   x-api-key sent to BijbelAPI (internal key, no rate limits)
 *   BIJBELAPI_URL   default https://www.bijbelapi.com
 */

export const REMOTE_COMMENTARIES: ReadonlySet<string> = new Set([
  'matthew_henry_nl',
  'dachsel',
  'calvijn_nl',
]);

/** Legacy ids some callers still send (e.g. the /api/commentary default). */
const REMOTE_ALIASES: Readonly<Record<string, string>> = {
  matthew_henry: 'matthew_henry_nl',
  'matthew-henry': 'matthew_henry_nl',
  calvijn: 'calvijn_nl',
};

export function remoteCommentaryId(source: string): string | null {
  const id = REMOTE_ALIASES[source] ?? source;
  return REMOTE_COMMENTARIES.has(id) ? id : null;
}

type VerseMap = Record<string, string>;

const BASE_URL = (process.env.BIJBELAPI_URL || 'https://www.bijbelapi.com').replace(/\/+$/, '');
const TIMEOUT_MS = 8000;
// Commentary text only changes when the data repo is redeployed; a day of
// staleness is fine and keeps BijbelAPI calls (and our function time) low.
const REVALIDATE_SECONDS = 60 * 60 * 24;

// Per-instance memory in front of the Vercel data cache: a warm instance
// answers a repeat chapter without any network hop. Bounded so a crawler
// walking every chapter cannot grow it without limit.
const MEMORY_LIMIT = 200;
const MEMORY = new Map<string, VerseMap | null>();
const INFLIGHT = new Map<string, Promise<RemoteResult>>();

export type RemoteResult =
  | { ok: true; verses: VerseMap | null } // null = BijbelAPI says it does not exist
  | { ok: false }; // network/auth/server error - caller may fall back

function remember(key: string, value: VerseMap | null) {
  if (MEMORY.size >= MEMORY_LIMIT) {
    const oldest = MEMORY.keys().next().value;
    if (oldest !== undefined) MEMORY.delete(oldest);
  }
  MEMORY.set(key, value);
}

export async function fetchRemoteCommentary(
  id: string,
  book: string,
  chapter: number,
): Promise<RemoteResult> {
  const key = `${id}|${book.toLowerCase()}|${chapter}`;
  if (MEMORY.has(key)) return { ok: true, verses: MEMORY.get(key) ?? null };
  const pending = INFLIGHT.get(key);
  if (pending) return pending;

  const run = (async (): Promise<RemoteResult> => {
    const url = new URL('/api/commentary', BASE_URL);
    url.searchParams.set('source', id);
    url.searchParams.set('book', book);
    url.searchParams.set('chapter', String(chapter));

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.BIJBELAPI_KEY) headers['x-api-key'] = process.env.BIJBELAPI_KEY;

    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS, tags: [`commentary:${id}`] },
      });
      if (res.status === 404) {
        remember(key, null);
        return { ok: true, verses: null };
      }
      if (!res.ok) {
        console.error(`[commentaryRemote] ${id} ${book} ${chapter}: HTTP ${res.status}`);
        return { ok: false };
      }
      const data = (await res.json()) as unknown;
      const verses =
        data && typeof data === 'object' && !Array.isArray(data) ? (data as VerseMap) : null;
      remember(key, verses);
      return { ok: true, verses };
    } catch (error) {
      console.error(`[commentaryRemote] ${id} ${book} ${chapter}:`, error);
      return { ok: false };
    }
  })().finally(() => INFLIGHT.delete(key));

  INFLIGHT.set(key, run);
  return run;
}
