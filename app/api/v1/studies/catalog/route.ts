import { corsPreflight, cachedJsonV1, handleV1Error } from '../../../../../lib/apiV1';
import { CATALOGUE_ENTRIES } from '../../../../../lib/bookStudies';

export async function OPTIONS() {
  return corsPreflight();
}

const SITE_ORIGIN = 'https://www.bijbelstudie.io';

/**
 * GET /api/v1/studies/catalog
 *
 * The whole catalogue: sixty-six bible-book studies plus the authored theme,
 * person and passage studies - the same set the website's /studies browses.
 *
 * Separate from `GET /api/v1/studies` on purpose. That route answers with the
 * eleven authored studies and a shipped app build renders every entry it
 * returns, so widening it would drop sixty-six rows into the list of a binary
 * that cannot lay them out. New clients ask here instead.
 *
 * The grouping metadata (`category`, `kind`, `lessonCount`, `avgMinutes`) is
 * resolved server-side from `CATALOGUE_ENTRIES`, which the website's catalogue
 * shares, so the two surfaces cannot disagree about which testament a book is
 * in or how long a lesson takes.
 */
export async function GET(req: Request) {
  try {
    const studies = CATALOGUE_ENTRIES.map(({ study, kind, category, lessonCount, avgMinutes }) => ({
      ...study,
      image: study.image && !study.image.startsWith('http')
        ? `${SITE_ORIGIN}${study.image}`
        : study.image,
      category,
      kind,
      lessonCount,
      avgMinutes,
    }));

    return cachedJsonV1(req, { studies }, { maxAge: 60 * 60 * 6, immutable: false });
  } catch (error) {
    return handleV1Error(error);
  }
}
