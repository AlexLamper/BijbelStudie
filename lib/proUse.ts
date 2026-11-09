/**
 * "The reader just opened this Pro thing", for what the server never sees
 * because it is a static file: the website's grondtekst and cross-references.
 * POST /api/v1/allowance does the rest - counts it during the reverse trial,
 * or takes today's slot when it is the reader's personal limit.
 *
 * Only called for a reader the session says is in their trial, or who has a
 * personal limit on study material, so nobody else pays a request for it.
 */
export type ProUseKind = 'grondtekst' | 'crossrefs';

export interface ProUseAnswer {
  allowed: boolean;
  mode: 'pro' | 'allowance' | 'free';
  used?: number;
  cap?: number;
  message?: string;
}

export async function reportProUse(kind: ProUseKind, key?: string): Promise<ProUseAnswer | null> {
  try {
    const res = await fetch('/api/v1/allowance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, key }),
    });
    return res.ok ? ((await res.json()) as ProUseAnswer) : null;
  } catch {
    return null;
  }
}
