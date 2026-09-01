import { cachedJsonV1, corsPreflight, errorV1, handleV1Error } from '../../../../../lib/apiV1';
import { geoDataService } from '../../../../../lib/geo-data';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * Photographs of the places a chapter names - the strip above "Algemene info"
 * on the study page.
 *
 * Every image is hosted by Wikimedia with an absolute URL, so the app renders
 * them straight from the source. `credit` and `license` travel with each one
 * because CC attribution has to be displayed, not just recorded.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const book = searchParams.get('book');
    const chapter = Number(searchParams.get('chapter'));

    if (!book || !Number.isInteger(chapter) || chapter < 1) {
      return errorV1('MISSING_FIELDS', 400, 'book and chapter are required');
    }

    const images = geoDataService.getImagesForChapter(book, chapter);

    return cachedJsonV1(
      req,
      {
        images: images.map((image) => ({
          id: image.id,
          url: image.fileUrl || image.url,
          thumbnailUrl: image.thumbnailUrl || image.fileUrl || image.url,
          placeName: image.placeName,
          description: image.description,
          credit: image.credit,
          license: image.license,
        })),
      },
      { maxAge: 60 * 60 * 24 * 30, immutable: false },
    );
  } catch (error) {
    return handleV1Error(error);
  }
}
