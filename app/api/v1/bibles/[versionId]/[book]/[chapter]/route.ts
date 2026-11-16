import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
} from '../../../../../../../lib/apiV1';
import { getMobileBibleChapter } from '../../../../../../../lib/mobileContent';
import {
  COPY_GUARD_REFUSAL,
  isCopyRestricted,
  mayServeToClient,
  requestCapabilities,
} from '../../../../../../../lib/bibleCopyPolicy';
import {
  applyRestrictedTextHeaders,
  restrictedChapterThrottle,
} from '../../../../../../../lib/restrictedText';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/bibles/:versionId/:book/:chapter
 *
 * One chapter is the unit of transfer. There is deliberately no endpoint that
 * returns a whole version: 355 MB of corpus must never leave in one response,
 * and per-chapter delivery is what lets a licence be revoked by flipping one
 * entry in lib/mobileLicensing.ts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string; book: string; chapter: string }> },
) {
  try {
    const { versionId, book, chapter } = await params;
    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    // A restricted translation is only served to a client that says it can
    // honour the copy limit (lib/bibleCopyPolicy.ts). Unrestricted ones never
    // reach this branch, so no existing client is affected.
    if (!mayServeToClient(versionId, requestCapabilities(req))) {
      return errorV1(COPY_GUARD_REFUSAL.code, COPY_GUARD_REFUSAL.status, COPY_GUARD_REFUSAL.message);
    }

    // Licensed text: a reader's pace, and never a shared CDN copy (which would
    // answer the next caller without this throttle ever running).
    const wait = restrictedChapterThrottle(req, versionId);
    if (wait !== null) {
      return errorV1('RATE_LIMITED', 429, `Probeer het over ${wait}s opnieuw.`);
    }

    const decodedBook = decodeURIComponent(book);
    const payload = await getMobileBibleChapter(versionId, decodedBook, chapterNumber);
    if (!payload) return errorV1('NOT_FOUND', 404, 'Hoofdstuk niet gevonden.');

    if (isCopyRestricted(versionId)) {
      return applyRestrictedTextHeaders(
        cachedJsonV1(req, payload, {
          private: true,
          maxAge: 60 * 60,
          varyHeaders: ['X-Bs-Capabilities'],
        }),
      );
    }
    return cachedJsonV1(req, payload);
  } catch (error) {
    return handleV1Error(error);
  }
}
