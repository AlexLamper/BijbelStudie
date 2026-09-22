import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../lib/apiV1';
import { getMobileCrossRefChapter } from '../../../../../../lib/mobileContent';
import { assertMobileAllowed } from '../../../../../../lib/mobileLicensing';

export const runtime = 'nodejs';

/**
 * Browser copy is a day, the shared copy a week.
 *
 * The shards are committed generated data: unlike scripture they really can be
 * rebuilt (a re-tuned vote threshold, a corrected versification table), and
 * this URL carries no dataset segment to bump, so neither copy may be
 * `immutable`. A week on the CDN is the bounded window in which a rebuild
 * reaches readers even if nothing invalidates the cache explicitly; the ETag
 * makes the revalidation after it one empty round trip.
 */
const BROWSER_MAX_AGE = 60 * 60 * 24;
const CDN_MAX_AGE = 60 * 60 * 24 * 7;

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/crossrefs/:book/:chapter?version=<versionId>
 *
 * Cross references for one chapter, from OpenBible.info (CC BY). The response
 * is the same bytes for every caller - free, guests included, no `resolveUser`
 * - which is exactly what lets it be `public` and sit on the CDN. Gating it
 * would force `private`, and `private` means a function wakes for every read
 * on a CPU budget that has no room for that.
 *
 * The data is verse coordinates, not text, so this route redistributes no
 * translation. `version` is still gated: the numbering the shard was built for
 * and the book names rendered in each label both belong to that translation,
 * so asking for cross references "in NET" is asking for a NET-shaped answer
 * and gets the same 451 every other content route gives.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ book: string; chapter: string }> },
) {
  try {
    const { book, chapter } = await params;
    const versionId = new URL(req.url).searchParams.get('version') ?? 'statenvertaling';

    // Licensing before anything else, and before the 400: a blocked source must
    // answer 451 whatever else is wrong with the request, or the block leaks
    // through as "fix the chapter number and try again".
    assertMobileAllowed('crossref', 'openbible');
    assertMobileAllowed('bible', versionId);

    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    const payload = await getMobileCrossRefChapter(
      versionId,
      decodeURIComponent(book),
      chapterNumber,
    );
    // Only an unknown book or chapter is a 404, and it is deliberately not
    // cached. A real chapter with no references returns 200 and an empty
    // `verses` array from the call above.
    if (!payload) return errorV1('NOT_FOUND', 404, 'Hoofdstuk niet gevonden.');

    return cachedJsonV1(req, payload, {
      maxAge: BROWSER_MAX_AGE,
      cdnMaxAge: CDN_MAX_AGE,
      immutable: false,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
