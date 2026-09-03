import { NextResponse } from 'next/server';
import { getCommentaries } from '../../../lib/local-data';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../lib/httpCache';

/**
 * The list of commentary sources - names only, identical for every caller.
 * The commentary TEXT is entitlement-dependent and is served by
 * /api/commentary, which must stay uncached.
 */
export async function GET() {
  const commentaries = await getCommentaries();
  if (!Array.isArray(commentaries) || commentaries.length === 0) {
    return NextResponse.json(commentaries);
  }

  return NextResponse.json(commentaries, {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
