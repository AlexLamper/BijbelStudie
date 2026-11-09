import { NextResponse } from 'next/server';
import { isEmailKind, unsubscribe, verifyUnsubscribeToken } from '../../../../lib/emailPrefs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/email/unsubscribe?u=<userId>&k=winback|all&t=<token>
 *
 * Two callers: a mail client's RFC 8058 one-click unsubscribe (the
 * `List-Unsubscribe-Post` header, a POST with no session and a form body we
 * ignore), and the button on /afmelden. The token is the whole authorisation
 * (lib/emailPrefs.ts), and all it can do is switch mail off.
 *
 * GET only forwards to the confirmation page and changes nothing: link
 * scanners and mail previews fetch every URL in a message, and a GET that
 * unsubscribed would sign people out of mail they never refused.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get('u');
  const k = url.searchParams.get('k');
  const t = url.searchParams.get('t');
  if (!verifyUnsubscribeToken(u, k, t) || !isEmailKind(k)) {
    return NextResponse.json({ ok: false, error: 'INVALID_LINK' }, { status: 400 });
  }
  try {
    await unsubscribe(u as string, k);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[email/unsubscribe] failed', error);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = new URL('/afmelden', url.origin);
  for (const key of ['u', 'k', 't']) {
    const value = url.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, 303);
}
