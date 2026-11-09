import { type NextRequest, NextResponse } from 'next/server';
import { runWinback } from '../../../../lib/winback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Sends are spaced for Resend's rate limit; 150 mails take about 90 seconds.
export const maxDuration = 300;

/**
 * The win-back mail run (lib/winback.ts), daily from vercel.json.
 *
 * Gated like the other internal crons: `Authorization: Bearer <CRON_SECRET>`
 * (what Vercel's scheduler sends) or `x-cron-secret`, failing closed when no
 * secret is configured. `?dry=1` decides and counts without writing or
 * sending anything - the way to see what tomorrow's run would do.
 */
function isAuthorized(req: NextRequest, secrets: string[]): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = req.headers.get('x-cron-secret') ?? '';
  return secrets.some((secret) => bearer === secret || header === secret);
}

export async function GET(req: NextRequest) {
  const secrets = [process.env.CRON_SECRET].filter((value): value is string => !!value);
  if (secrets.length === 0) {
    console.error('[internal/winback-emails] Missing CRON_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!isAuthorized(req, secrets)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry') === '1';
  const limit = Number(url.searchParams.get('limit')) || undefined;

  try {
    const summary = await runWinback({ dryRun, limit });
    console.log('[internal/winback-emails]', JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[internal/winback-emails] run failed', error);
    return NextResponse.json({ error: 'Run failed' }, { status: 500 });
  }
}
