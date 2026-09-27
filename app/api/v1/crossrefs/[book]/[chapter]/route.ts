import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../lib/apiV1';
import { resolveUser } from '../../../../../../lib/apiAuth';
import { getMobileCrossRefChapter } from '../../../../../../lib/mobileContent';
import { assertMobileAllowed } from '../../../../../../lib/mobileLicensing';
import { gateCrossRefChapter } from '../../../../../../lib/proContent';

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
 * GET /api/v1/crossrefs/:book/:chapter?version=<versionId>[&full=1]
 *
 * Cross references for one chapter, from OpenBible.info (CC BY). Free readers
 * see the first `FREE_CROSS_REFS` per verse (the top-voted ones); the rest is
 * Pro (lib/proContent.ts `gateCrossRefChapter`).
 *
 * TWO URLS, SO THE CDN STAYS IN FRONT OF THE FREE PATH:
 *
 *  - Without `full`, the response is the FREE-GATED chapter for every caller -
 *    guests, free and Pro alike - with no `resolveUser`. Same bytes for
 *    everyone is exactly what lets it stay `public` with `s-maxage`, so a free
 *    read costs no function on a CDN hit. Installed app builds call this URL;
 *    a Pro reader on an old build sees the free slice until they update.
 *  - With `full=1`, the caller is resolved (bearer or website cookie) and a Pro
 *    reader gets every reference. That answer depends on who is asking, so it
 *    is `private` + `Vary: Authorization` and never lands in a shared cache -
 *    only Pro readers pay a function per read. A non-Pro caller on this URL
 *    gets the free slice, still `private`.
 *
 * Either way the body is keyed by URL, so a Pro response can never be served
 * from the CDN to a free reader, nor a free one to a Pro reader on `full=1`.
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
    const search = new URL(req.url).searchParams;
    const versionId = search.get('version') ?? 'statenvertaling';
    const wantsFull = search.get('full') === '1';

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

    if (!wantsFull) {
      return cachedJsonV1(req, gateCrossRefChapter(payload, { isPro: false }), {
        maxAge: BROWSER_MAX_AGE,
        cdnMaxAge: CDN_MAX_AGE,
        immutable: false,
      });
    }

    const user = await resolveUser(req);
    return cachedJsonV1(req, gateCrossRefChapter(payload, { isPro: user?.isPro ?? false }), {
      // `private` drops `s-maxage` and adds `Vary: Authorization`. No device
      // max-age either: a lapsed subscription must not keep the full list
      // alive in a client cache; the ETag keeps the re-check cheap.
      private: true,
      maxAge: 0,
      immutable: false,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
