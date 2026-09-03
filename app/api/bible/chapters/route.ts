import { NextResponse } from 'next/server';
import { getChapters } from '../../../../lib/local-data';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../lib/httpCache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || 'statenvertaling';
  const book = searchParams.get('book');

  if (!book) return NextResponse.json([], { status: 400 });

  const chapters = await getChapters(version, book);
  // An empty list means the book was not found in this version, which a deploy
  // can change; only a real answer is worth a shared copy.
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return NextResponse.json(chapters);
  }

  return NextResponse.json(chapters, {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
