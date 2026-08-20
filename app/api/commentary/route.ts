import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authOptions';
import { getCommentary } from '../../../lib/local-data';
import { gateCommentary } from '../../../lib/proContent';

export const dynamic = 'force-dynamic';

/**
 * Commentary for one chapter.
 *
 * The response used to be the raw verse map, in full, to anyone — the paywall
 * lived entirely in `CommentaryComponent`, which masked the overflow in CSS.
 * Anything that skipped the component (curl, devtools, the Network tab) got the
 * whole chapter. The entitlement is now resolved here and the text a free
 * reader is not entitled to never leaves the process.
 *
 * The shape changed with it: the bare map had no room for a `locked` flag
 * without colliding with a verse key, and the client cannot render a paywall
 * over content whose absence it cannot detect. It now returns
 * `{ verses, locked, totalEntries }`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'matthew_henry';
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');

  if (!book || !chapter) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const data = (await getCommentary(source, book, Number(chapter))) as Record<
    string,
    string
  > | null;

  if (!data || Object.keys(data).length === 0) {
    return NextResponse.json({}, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const isPro = Boolean(session?.user?.isSubscribed);

  // Object key order is the verse order the store wrote them in, and both the
  // gate and the client depend on it: the preview has to be the *opening* of
  // the chapter, not an arbitrary slice of it.
  const entries = Object.entries(data).map(([key, text]) => ({ key, text }));
  const gated = gateCommentary(
    entries,
    (entry) => entry.text,
    (entry, text) => ({ ...entry, text }),
    { commentaryId: source, isPro },
  );

  return NextResponse.json(
    {
      verses: Object.fromEntries(gated.items.map((entry) => [entry.key, entry.text])),
      locked: gated.locked,
      totalEntries: entries.length,
    },
    {
      // Never `public`: this body depends on who asked, and one CDN entry
      // shared between a subscriber and a visitor would undo the whole gate.
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
