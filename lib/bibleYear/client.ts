/**
 * Browser client for the "Bijbel in een jaar" API (app/api/v1/bible-year/**),
 * typed against lib/bibleYear/types.ts. Cookie auth: every call sends
 * credentials. Nothing throws - each call resolves to a result the UI can
 * branch on, with 401 (signed out) and 409 (a plan is already running) as
 * their own kinds so they can be handled gently instead of as errors.
 */

import type {
  BibleYearMarkBody,
  BibleYearMutationResponse,
  BibleYearPatchBody,
  BibleYearPlanKey,
  BibleYearSchedule,
  BibleYearStartBody,
  BibleYearStateResponse,
  BibleYearTrackKey,
} from './types';

export type BibleYearErrorKind = 'unauthorized' | 'conflict' | 'not_found' | 'server' | 'network';

/**
 * `kind` and `message` sit (as undefined) on the success shape too: the
 * project compiles without strictNullChecks, where a boolean discriminant
 * does not narrow, so both must be readable on the union as a whole.
 */
export type BibleYearResult<T> =
  | { ok: true; data: T; kind?: undefined; message?: undefined }
  | { ok: false; data?: undefined; kind: BibleYearErrorKind; status: number; message: string };

const BASE = '/api/v1/bible-year';

const MESSAGES: Record<BibleYearErrorKind, string> = {
  unauthorized: 'Log in om je leesplan te bewaren.',
  conflict: 'Je hebt al een leesplan lopen.',
  not_found: 'Er is geen leesplan gevonden.',
  server: 'Dat lukte niet. Probeer het zo nog eens.',
  network: 'Geen verbinding. Probeer het zo nog eens.',
};

function kindFor(status: number): BibleYearErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 409) return 'conflict';
  if (status === 404) return 'not_found';
  return 'server';
}

async function request<T>(path: string, init?: RequestInit): Promise<BibleYearResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    return { ok: false, kind: 'network', status: 0, message: MESSAGES.network };
  }

  if (!response.ok) {
    const kind = kindFor(response.status);
    let message = MESSAGES[kind];
    // A 409 or 400 may carry a Dutch reason worth showing as is.
    if (kind === 'conflict' || response.status === 400) {
      try {
        const body = (await response.json()) as { error?: unknown; message?: unknown };
        const text = typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : null;
        if (text && response.status === 400) message = text;
      } catch {
        /* no body */
      }
    }
    return { ok: false, kind, status: response.status, message };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, kind: 'server', status: response.status, message: MESSAGES.server };
  }
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/** GET /api/v1/bible-year - catalogue, tracks, enrollment and today. */
export function fetchBibleYearState(): Promise<BibleYearResult<BibleYearStateResponse>> {
  return request<BibleYearStateResponse>(BASE, { cache: 'no-store' });
}

/** POST /api/v1/bible-year - 409 (`kind: 'conflict'`) when a plan is active. */
export function startBibleYear(body: BibleYearStartBody): Promise<BibleYearResult<BibleYearMutationResponse>> {
  return request<BibleYearMutationResponse>(BASE, json('POST', body));
}

/** PATCH /api/v1/bible-year - shift, stop or restart. */
export function patchBibleYear(body: BibleYearPatchBody): Promise<BibleYearResult<BibleYearMutationResponse>> {
  return request<BibleYearMutationResponse>(BASE, json('PATCH', body));
}

/** POST /api/v1/bible-year/mark - chapters or a whole day, read or unread. */
export function markBibleYear(body: BibleYearMarkBody): Promise<BibleYearResult<BibleYearMutationResponse>> {
  return request<BibleYearMutationResponse>(`${BASE}/mark`, json('POST', body));
}

/** GET /api/v1/bible-year/schedule - static and cacheable, no account needed. */
export function fetchBibleYearSchedule(
  plan: BibleYearPlanKey,
  track: BibleYearTrackKey,
  version?: number,
): Promise<BibleYearResult<BibleYearSchedule>> {
  const params = new URLSearchParams({ plan, track });
  if (version != null) params.set('version', String(version));
  return request<BibleYearSchedule>(`${BASE}/schedule?${params.toString()}`);
}

/**
 * Start a plan; when one is already running (409), replace it through PATCH
 * restart, which marks the old one abandoned and keeps its document.
 */
export async function startOrRestartBibleYear(
  body: BibleYearStartBody,
): Promise<BibleYearResult<BibleYearMutationResponse>> {
  const first = await startBibleYear(body);
  if (first.ok || first.kind !== 'conflict') return first;
  return patchBibleYear({ action: 'restart', ...body });
}
