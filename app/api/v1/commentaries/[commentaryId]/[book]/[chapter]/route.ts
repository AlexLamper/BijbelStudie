import type { NextRequest } from 'next/server';
import {
  cachedJsonV1,
  corsPreflight,
  errorV1,
  handleV1Error,
  jsonV1,
} from '../../../../../../../lib/apiV1';
import { calvinCoverageEnvelope } from '../../../../../../../lib/calvinCoverage';
import { getMobileCommentaryChapter } from '../../../../../../../lib/mobileContent';
import { resolveUser } from '../../../../../../../lib/apiAuth';
import { gateCommentary } from '../../../../../../../lib/proContent';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/** GET /api/v1/commentaries/:commentaryId/:book/:chapter */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commentaryId: string; book: string; chapter: string }> },
) {
  try {
    const { commentaryId, book, chapter } = await params;
    const chapterNumber = Number(chapter);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return errorV1('INVALID_CHAPTER', 400, 'chapter moet een positief geheel getal zijn.');
    }

    const decodedBook = decodeURIComponent(book);
    const payload = await getMobileCommentaryChapter(commentaryId, decodedBook, chapterNumber);
    if (!payload) {
      // Additive: Calvin sources explain WHY there is nothing (lib/calvinCoverage.ts).
      const coverage = calvinCoverageEnvelope({
        sourceId: commentaryId,
        book: decodedBook,
        chapter: chapterNumber,
        texts: null,
      });
      if (coverage) {
        return jsonV1(
          { error: 'NOT_FOUND', message: coverage.message ?? 'Commentaar niet gevonden.', coverage },
          { status: 404 },
        );
      }
      return errorV1('NOT_FOUND', 404, 'Commentaar niet gevonden.');
    }

    // Computed on the ungated text, so a free reader's preview never looks
    // like "no content".
    const coverage = calvinCoverageEnvelope({
      sourceId: commentaryId,
      book: decodedBook,
      chapter: chapterNumber,
      texts: payload.verses.map((v) => v.t),
    });

    const user = await resolveUser(req);
    const gated = gateCommentary(
      payload.verses,
      (v) => v.t,
      (v, t) => ({ ...v, t }),
      { commentaryId, isPro: user?.isPro ?? false },
    );

    return cachedJsonV1(
      req,
      {
        ...payload,
        verses: gated.items,
        locked: gated.locked,
        totalVerses: payload.verses.length,
        // Only present for Calvin sources, so other payloads are unchanged.
        ...(coverage ? { coverage } : {}),
      },
      { private: true },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
