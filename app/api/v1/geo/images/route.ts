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

    // `fallback=book` is what the guided study flow asks for: most chapters name
    // no place at all, and an empty Beeld panel reads as broken rather than as
    // "nothing here". The web route has had this since the flow shipped.
    const chapterImages = geoDataService.getImagesForChapter(book, chapter);
    const useBookFallback =
      chapterImages.length === 0 && searchParams.get('fallback') === 'book';
    const images = useBookFallback ? geoDataService.getImagesForBook(book) : chapterImages;

    return cachedJsonV1(
      req,
      {
        scope: useBookFallback ? 'book' : 'chapter',
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
