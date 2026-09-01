import { corsPreflight, cachedJsonV1, handleV1Error } from '../../../../lib/apiV1';
import { curatedStudies } from '../../../../lib/data/curated-studies';

export async function OPTIONS() {
  return corsPreflight();
}

const SITE_ORIGIN = 'https://www.bijbelstudie.io';

/**
 * The guided studies shown on `/studies`.
 *
 * Static content, so it is ETagged and cached hard - the app ships no copy of
 * it, which keeps a lesson edit on the website a deploy rather than a release.
 * Image paths are absolutised because the client has no notion of the site
 * root.
 */
export async function GET(req: Request) {
  try {
    const studies = curatedStudies.map((study) => ({
      ...study,
      image: study.image.startsWith('http') ? study.image : `${SITE_ORIGIN}${study.image}`,
    }));
    return cachedJsonV1(req, { studies }, { maxAge: 60 * 60 * 6, immutable: false });
  } catch (error) {
    return handleV1Error(error);
  }
}
