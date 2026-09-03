import { NextResponse } from 'next/server';
import { getVersions } from '../../../../lib/local-data';
import { PUBLIC_CONTENT_CACHE_CONTROL } from '../../../../lib/httpCache';

export async function GET() {
  const versions = await getVersions();
  if (!Array.isArray(versions) || versions.length === 0) {
    return NextResponse.json(versions);
  }

  return NextResponse.json(versions, {
    headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_CONTROL },
  });
}
