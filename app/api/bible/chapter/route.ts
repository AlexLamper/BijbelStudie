import { NextResponse } from 'next/server';
import { getChapter } from '../../../../lib/local-data';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../lib/httpCache';
import { isCopyRestricted } from '../../../../lib/bibleCopyPolicy';
import {
  RESTRICTED_TEXT_HEADERS,
  restrictedChapterThrottle,
} from '../../../../lib/restrictedText';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || 'statenvertaling';
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');

  if (!book || !chapter) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  // Licensed text (HSV): one chapter at a reader's pace, never a shared cache.
  const restricted = isCopyRestricted(version);
  const wait = restrictedChapterThrottle(request, version);
  if (wait !== null) {
    return NextResponse.json(
      { error: 'Te veel hoofdstukken in korte tijd. Probeer het straks opnieuw.' },
      { status: 429, headers: { 'Retry-After': String(wait), 'Cache-Control': 'no-store' } },
    );
  }

  const data = await getChapter(version, book, Number(chapter));
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only the 200 is cached. A 404 here can mean "not synced yet" as easily as
  // "does not exist", and a week-long shared copy of that answer would outlive
  // the deploy that fixes it.
  return NextResponse.json(data, {
    headers: restricted
      ? RESTRICTED_TEXT_HEADERS
      : { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
