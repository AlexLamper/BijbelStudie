import { cachedJsonV1, corsPreflight, errorV1, handleV1Error } from '../../../../lib/apiV1';
import { getBibleSummary } from '../../../../lib/local-data';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * The book introduction behind the study page's "Algemene info" tab
 * (`components/study/HistoricalContext.tsx`).
 *
 * Public-domain reference text keyed by book, so it is ETagged like scripture
 * rather than fetched per session.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const book = searchParams.get('book');
    const lang = searchParams.get('lang') || 'nl';

    if (!book) return errorV1('MISSING_FIELDS', 400, 'book is required');

    const summary = await getBibleSummary(book, lang);
    if (!summary) return errorV1('NOT_FOUND', 404, 'Geen informatie voor dit boek');

    return cachedJsonV1(req, { book, lang, summary });
  } catch (error) {
    return handleV1Error(error);
  }
}
