import fs from 'fs';
import path from 'path';
import { bookNameMap } from './book-mapping';
import { translatePlaceName } from './place-name-translations';

// OSIS Book Codes
const OSIS_CODES: Record<string, string> = {
  'Genesis': 'Gen',
  'Exodus': 'Exod',
  'Leviticus': 'Lev',
  'Numbers': 'Num',
  'Deuteronomy': 'Deut',
  'Joshua': 'Josh',
  'Judges': 'Judg',
  'Ruth': 'Ruth',
  '1 Samuel': '1Sam',
  '2 Samuel': '2Sam',
  '1 Kings': '1Kgs',
  '2 Kings': '2Kgs',
  '1 Chronicles': '1Chr',
  '2 Chronicles': '2Chr',
  'Ezra': 'Ezra',
  'Nehemiah': 'Neh',
  'Esther': 'Esth',
  'Job': 'Job',
  'Psalms': 'Ps',
  'Proverbs': 'Prov',
  'Ecclesiastes': 'Eccl',
  'Song of Solomon': 'Song',
  'Isaiah': 'Isa',
  'Jeremiah': 'Jer',
  'Lamentations': 'Lam',
  'Ezekiel': 'Ezek',
  'Daniel': 'Dan',
  'Hosea': 'Hos',
  'Joel': 'Joel',
  'Amos': 'Amos',
  'Obadiah': 'Obad',
  'Jonah': 'Jonah',
  'Micah': 'Mic',
  'Nahum': 'Nah',
  'Habakkuk': 'Hab',
  'Zephaniah': 'Zeph',
  'Haggai': 'Hag',
  'Zechariah': 'Zech',
  'Malachi': 'Mal',
  'Matthew': 'Matt',
  'Mark': 'Mark',
  'Luke': 'Luke',
  'John': 'John',
  'Acts': 'Acts',
  'Romans': 'Rom',
  '1 Corinthians': '1Cor',
  '2 Corinthians': '2Cor',
  'Galatians': 'Gal',
  'Ephesians': 'Eph',
  'Philippians': 'Phil',
  'Colossians': 'Col',
  '1 Thessalonians': '1Thess',
  '2 Thessalonians': '2Thess',
  '1 Timothy': '1Tim',
  '2 Timothy': '2Tim',
  'Titus': 'Titus',
  'Philemon': 'Phlm',
  'Hebrews': 'Heb',
  'James': 'Jas',
  '1 Peter': '1Pet',
  '2 Peter': '2Pet',
  '1 John': '1John',
  '2 John': '2John',
  '3 John': '3John',
  'Jude': 'Jude',
  'Revelation': 'Rev'
};

interface AncientPlace {
  id: string;
  friendly_id: string;
  verses: {
    osis: string;
    readable: string;
  }[];
  identifications: {
    id: string; // modern id
    description: string;
    media?: {
      thumbnail?: {
        image_id: string;
        credit: string;
        credit_url: string;
        file: string;
        description: string;
      }
    }
  }[];
  extra?: string; // JSON string
}

interface ImageEntry {
  id: string;
  url: string;
  file_url: string;
  thumbnail_url_pattern: string;
  credit: string;
  credit_url: string;
  license: string;
  descriptions: Record<string, string>;
  thumbnails: Record<string, {
    file: string;
    placeholder: string;
  }>;
}

export interface GeoImage {
  id: string;
  url: string;
  fileUrl: string;       // direct upload.wikimedia.org image URL — always loads
  thumbnailUrl: string;
  description: string;
  credit: string;
  creditUrl: string;
  license: string;
  placeName: string;
  verses: string[];
  modernId: string;
}

export class GeoDataService {
  private ancientData: AncientPlace[] | null = null;
  private imageData: Map<string, ImageEntry> | null = null;

  private loadData() {
    if (this.ancientData && this.imageData) return;

    try {
      const ancientPath = path.join(process.cwd(), 'public', 'data', 'ancient.jsonl');
      const imagePath = path.join(process.cwd(), 'public', 'data', 'image.jsonl');

      const ancientContent = fs.readFileSync(ancientPath, 'utf-8');
      this.ancientData = ancientContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const imageContent = fs.readFileSync(imagePath, 'utf-8');
      this.imageData = new Map();
      imageContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const img = JSON.parse(line) as ImageEntry;
          this.imageData!.set(img.id, img);
        });

    } catch (error) {
      console.error('Error loading geo data:', error);
      this.ancientData = [];
      this.imageData = new Map();
    }
  }

  public getImagesForChapter(bookName: string, chapter: number): GeoImage[] {
    this.loadData();

    const englishName = bookNameMap[bookName] || bookName;
    const osisBook = OSIS_CODES[englishName] || englishName;
    const chapterPrefix = `${osisBook}.${chapter}.`;
    const chapterExact  = `${osisBook}.${chapter}`;

    if (!osisBook || osisBook === englishName && !OSIS_CODES[englishName]) return [];

    const results: GeoImage[] = [];
    const seenImageIds = new Set<string>();

    for (const place of this.ancientData || []) {
      const relevantVerses = place.verses?.filter(v =>
        v.osis.startsWith(chapterPrefix) || v.osis === chapterExact
      );
      if (!relevantVerses || relevantVerses.length === 0) continue;

      if (place.identifications) {
        for (const ident of place.identifications) {
          if (!ident.media?.thumbnail?.image_id) continue;

          const imageId = ident.media.thumbnail.image_id;
          if (seenImageIds.has(imageId)) continue;

          const imageEntry = this.imageData?.get(imageId);
          if (!imageEntry) continue;

          seenImageIds.add(imageId);

          const thumbUrl = imageEntry.thumbnail_url_pattern.replace('####', '640');
          const description = (imageEntry.descriptions[ident.id] ||
                               ident.media.thumbnail.description ||
                               place.friendly_id).replace(/<[^>]*>/g, '');

          results.push({
            id: imageId,
            url: imageEntry.url,
            fileUrl: imageEntry.file_url,
            thumbnailUrl: thumbUrl,
            description,
            credit: imageEntry.credit,
            creditUrl: imageEntry.credit_url,
            license: imageEntry.license,
            placeName: translatePlaceName(place.friendly_id),
            verses: relevantVerses.map(v => v.readable),
            modernId: ident.id,
          });
        }
      }
    }

    return results;
  }
}

export const geoDataService = new GeoDataService();
