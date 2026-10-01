import type { NextRequest } from 'next/server';
import { cachedJsonV1, corsPreflight, handleV1Error } from '../../../../../lib/apiV1';
import { hsvIndex } from '../../../../../lib/hsvQuotes';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bibles/hsv
 *
 * Which verses of the Herziene Statenvertaling this product may quote, as bare
 * references - no text. A reference is a coordinate, so this response costs
 * nothing against the 50-verse allowance (lib/hsvQuota.ts) and may be cached
 * and shared freely; it is what lets a reader see an "HSV" control appear on
 * the right verse without a request per chapter.
 *
 * The text itself is a different route, behind a sign-in. There is deliberately
 * no chapter, book or whole-version endpoint for HSV, and `hsv` stays out of
 * /api/v1/bibles so no client ever offers it as something to read.
 */
export async function GET(req: NextRequest) {
  try {
    return cachedJsonV1(req, hsvIndex(), { maxAge: 60 * 60 * 24, immutable: false });
  } catch (error) {
    return handleV1Error(error);
  }
}
