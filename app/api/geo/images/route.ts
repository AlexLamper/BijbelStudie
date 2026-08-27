import { NextRequest, NextResponse } from 'next/server';
import { geoDataService } from '../../../../lib/geo-data';

/**
 * Chapter imagery for the historical-context tab.
 *
 * Deliberately unauthenticated: the tab it feeds is free for everyone, so
 * requiring a session here would gate a feature the product gives away. What it
 * does need is bounded input - the handler previously passed `parseInt()` of an
 * arbitrary string straight into the lookup, so `?chapter=abc` reached the data
 * layer as NaN. The data itself is static and identical for every caller, which
 * is also why it is worth caching at the edge rather than recomputing per hit.
 */

const MAX_BOOK_LENGTH = 40;
const MAX_CHAPTER = 150; // Psalms, the longest book in the canon

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const book = searchParams.get('book');
  const chapterParam = searchParams.get('chapter');

  if (!book || !chapterParam) {
    return NextResponse.json({ error: 'Book and chapter are required' }, { status: 400 });
  }

  if (book.length > MAX_BOOK_LENGTH) {
    return NextResponse.json({ error: 'Invalid book' }, { status: 400 });
  }

  const chapter = Number(chapterParam);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > MAX_CHAPTER) {
    return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 });
  }

  try {
    const chapterImages = geoDataService.getImagesForChapter(book, chapter);

    // `fallback=book` is what the guided study flow asks for: a chapter with no
    // places of its own (a prayer, a vision) would otherwise leave an empty
    // panel beside the commentary, which reads as broken rather than as empty.
    const useBookFallback =
      chapterImages.length === 0 && searchParams.get('fallback') === 'book';
    const images = useBookFallback ? geoDataService.getImagesForBook(book) : chapterImages;

    return NextResponse.json(
      { images, scope: useBookFallback ? 'book' : 'chapter' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching geo images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
