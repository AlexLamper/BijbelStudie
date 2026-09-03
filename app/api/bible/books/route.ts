import { NextResponse } from 'next/server';
import { getBooks } from '../../../../lib/local-data';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../lib/httpCache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version') || 'statenvertaling'; // Default version
  const books = await getBooks(version);
  if (!Array.isArray(books) || books.length === 0) {
    return NextResponse.json(books);
  }

  return NextResponse.json(books, {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
