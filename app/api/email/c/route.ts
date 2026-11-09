import { NextResponse } from 'next/server';
import { recordServerEvent } from '../../../../lib/serverAnalytics';
import { WINBACK_STAGES } from '../../../../lib/winback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Paths a mail button may land on. Anything else goes to the dashboard. */
const ALLOWED = /^\/(dashboard|lezen|studie\/[A-Za-z0-9._~%-]+\/\d+|profiel\/boom|instellingen)(\?[A-Za-z0-9=&%._~-]*)?$/;

/**
 * GET /api/email/c?s=<stage>&to=<path>
 *
 * The win-back mail's button. Counts `winback_email_clicked` with nothing but
 * the stage - no account id, no token, so the link identifies nobody - and
 * redirects to `to` when it is one of the site's own paths. An open pixel was
 * left out on purpose: blocked by most clients, and tracking for its own sake.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const stage = url.searchParams.get('s');
  const to = url.searchParams.get('to') ?? '/dashboard';
  const path = ALLOWED.test(to) ? to : '/dashboard';
  if (stage && (WINBACK_STAGES as readonly number[]).map(String).includes(stage)) {
    await recordServerEvent('winback_email_clicked', null, { stage });
  }
  return NextResponse.redirect(new URL(path, url.origin), 302);
}
