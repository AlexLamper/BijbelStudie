/**
 * What the "Tekst van de dag" card remembers, on this device only.
 *
 * `GET /api/bible/daytext` serves one verse and nothing else - no archive, no
 * per-user state - so the heart and "Bekijk voorgaande dagen" are backed by
 * localStorage, exactly as the mobile card backs them with SharedPreferences
 * (`lib/features/dashboard/data/daily_verse_store.dart`). Keeping the two
 * stores parallel means the two cards behave the same even though neither
 * knows about the other.
 *
 * Everything here tolerates localStorage being unavailable or corrupt: a
 * private window, cleared site data, or a browser refusing storage. The card
 * must still render today's verse in that case; it simply forgets.
 */

export type StoredVerse = {
  /** `yyyy-mm-dd` of the day it was shown. One entry per day. */
  date: string;
  text: string;
  reference: string;
  book: string;
  chapter: number;
  verse?: number;
  /** Abbreviation as printed after the reference, e.g. "SV". */
  version: string;
};

const HISTORY_KEY = 'bijbelstudie_daytext_history';
const LIKES_KEY = 'bijbelstudie_daytext_likes';

/** Roughly two months of verses. Beyond that nobody scrolls. */
const MAX_HISTORY = 60;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota, or storage blocked. Forgetting is an acceptable outcome here.
  }
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** The archive, newest day first. */
export function readHistory(): StoredVerse[] {
  return read<StoredVerse[]>(HISTORY_KEY, []).filter(
    (entry) => typeof entry?.reference === 'string' && typeof entry?.text === 'string',
  );
}

/**
 * Records today's verse, once per day.
 *
 * Keyed on the date rather than the reference, so a feed that repeats a verse
 * months later still gets its own entry, and reopening the dashboard five
 * times in one day does not create five.
 */
export function rememberVerse(entry: StoredVerse): StoredVerse[] {
  const history = readHistory();
  const withoutToday = history.filter((item) => item.date !== entry.date);
  const next = [entry, ...withoutToday].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function readLikes(): string[] {
  return read<string[]>(LIKES_KEY, []).filter((r) => typeof r === 'string');
}

export function isLiked(reference: string, likes = readLikes()): boolean {
  return likes.includes(reference);
}

/** Adds or removes a reference, returning the new list. */
export function toggleLike(reference: string): string[] {
  const likes = readLikes();
  const next = likes.includes(reference)
    ? likes.filter((r) => r !== reference)
    : [reference, ...likes];
  write(LIKES_KEY, next);
  return next;
}

/**
 * The short label printed after a reference.
 *
 * Mirrors `versionAbbreviation` in the app's `daily_verse_card.dart`. The
 * daytext route sends a display name ("Statenvertaling") rather than an id, so
 * both spellings are accepted; anything unrecognised falls back to capitals,
 * which looks wrong but is never blank.
 */
export function versionAbbreviation(version: string | null | undefined): string {
  const key = (version ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
  const map: Record<string, string> = {
    statenvertaling: 'SV',
    sv: 'SV',
    nbg51: 'NBG51',
    nbgvertaling1951: 'NBG51',
    canisiusbijbel: 'CANIS',
    heiligeschrift1917: 'HS1917',
    herzienestatenvertaling: 'HSV',
    hsv: 'HSV',
    kjv: 'KJV',
    kingjamesversion: 'KJV',
    asv: 'ASV',
    web: 'WEB',
    geneva: 'GNV',
    coverdale: 'CVDL',
    net: 'NET',
  };
  if (!key) return '';
  return map[key] ?? key.toUpperCase();
}

/** "maandag 1 september" for a stored `yyyy-mm-dd`. */
export function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * 76 nature photographs, one per day, rotating. Unsplash photographs,
 * used under the Unsplash License; the photographer is named above each one.
 *
 * All of them are calm landscapes on the dark side - every file was measured
 * before it went in (mean luminance at most 0.42, the top-left quadrant where
 * the eyebrow and the reference sit at most 0.50), so white text holds on
 * each of them behind the same scrim. The same set, in the same order, ships in
 * the app's `assets/images/daytext/`.
 */
const PHOTOS = [
  // Erbol Zhakenov - Ducks swimming in a foggy lake at dawn
  '/images/daytext/u-lTz3ko8JvRo.jpg',
  // Masaaki Komori - body of water under blue sky during sunset
  '/images/daytext/u-0eJcliicVso.jpg',
  // Sultonbek Ikromov - A view of the night sky with the milky in the distance
  '/images/daytext/u-ULDBQgDVjas.jpg',
  // Christian Weiss - a person walking across a sandy field in the desert
  '/images/daytext/u-I0BAGzq7ljA.jpg',
  // Steven Kamenar - photography of tall trees at daytime
  '/images/daytext/u-MMJx78V7xS8.jpg',
  // Renden Yoder - stars in the sky
  '/images/daytext/u-H4PKDFNpnpg.jpg',
  // Joshua Gresham - a large rock sitting in the middle of a desert
  '/images/daytext/u--UaeK5K8q8I.jpg',
  // Rosie Sun - photography of forest
  '/images/daytext/u-1L71sPT5XKc.jpg',
  // Anthony Cantin - A group of people standing under a night sky filled with stars
  '/images/daytext/u-BBdPwLMwR4I.jpg',
  // Erik Adair - the night sky with stars and the milky
  '/images/daytext/u-rQ5rs_e0KWE.jpg',
  // Benjamin Cole - landscape photography of mountain at night
  '/images/daytext/u-DDhET-updco.jpg',
  // Natalia Gusakova - a body of water with a cloudy sky above it
  '/images/daytext/u-HcGKcMOMJIU.jpg',
  // Emilio Garcia - a group of pillars sitting on top of a grass covered field
  '/images/daytext/u-n4TbJNSYZZo.jpg',
  // Iain - Sunset over the ocean with rocky silhouette
  '/images/daytext/u-kR2-44lS4Yk.jpg',
  // Nidheesh Kavalan - silhouette of mountains under blue sky
  '/images/daytext/u-Ha501MB_XE8.jpg',
  // Taylor Burnfield - Pine needles with tiny water droplets
  '/images/daytext/u-rJUWeKvVUlA.jpg',
  // Venti Views - brown mountain under blue sky during night time
  '/images/daytext/u-USnraKKqLR4.jpg',
  // Jisca Lucia - The sun is shining through the trees in the forest
  '/images/daytext/u--sidLcag5lo.jpg',
  // Sean Jahansooz - brown rocky mountain under starry night
  '/images/daytext/u-poED7Zsm5n4.jpg',
  // Diana Rafira - A large body of water under a cloudy sky
  '/images/daytext/u-37Dc9aJ1PeQ.jpg',
  // Caleb Jack - the night sky is filled with stars and the milky
  '/images/daytext/u-Il12NRG7yRs.jpg',
  // Arto Marttinen - photo of mountains and sky
  '/images/daytext/u-K2K1Ec_51SA.jpg',
  // Marishka Tsiklauri - silhouette of mountain under blue sky with stars during night time
  '/images/daytext/u-UPrBQ3sQ6fA.jpg',
  // Moon Moons - a large body of water under a cloudy sky
  '/images/daytext/u-aMMKzKWlbds.jpg',
  '/images/daytext/1506905925346.jpg',
  // K T - brown sand under cloudy sky during daytime
  '/images/daytext/u-0tcgMRJKDf8.jpg',
  // Sudip Saha - lake near trees and mountain during daytime
  '/images/daytext/u-9aomUwLRN5E.jpg',
  // thomas shellberg - gray mountain at dawn
  '/images/daytext/u-PCCMe3-YQpA.jpg',
  // Taylor Wright - bare trees on forest during daytime
  '/images/daytext/u-2aSpCOPNyO0.jpg',
  '/images/daytext/1472214103451.jpg',
  // ELIAS VICARIO - white clouds
  '/images/daytext/u-8mkzC5-jYbE.jpg',
  // Casey Horner - Half Dome under a starry night sky in Yosemite Valley, United States
  '/images/daytext/u-O0R5XZfKUGQ.jpg',
  // Štefan Štefančík - silhouette of mountain beside the body of water at night time
  '/images/daytext/u-TPv9dh822VA.jpg',
  // Fabrizio Conti - Layered blue mountain silhouettes fading into a misty horizon under a clear sky
  '/images/daytext/u-c3wsMnxQZDw.jpg',
  '/images/daytext/1447752875215.jpg',
  // Frank Thiemonge - a body of water surrounded by mountains under a cloudy sky
  '/images/daytext/u-zL3bJpejvD8.jpg',
  // Nadia Ivanova - green leaf trees during daytime
  '/images/daytext/u-HEHSE12vXSg.jpg',
  // Benjamin Voros - snow mountain under stars
  '/images/daytext/u-phIFdC6lA4E.jpg',
  // Matt Drenth - the night sky with stars and trees silhouetted against a dark blue sky
  '/images/daytext/u-bBSaP-u_BHo.jpg',
  // Taylor Burnfield - Close-up view of pine tree needles and buds
  '/images/daytext/u-RlazTYhR-uI.jpg',
  // Jason Mavrommatis - silhouette of mountains during starry night
  '/images/daytext/u-FzURx0rFhUk.jpg',
  // Jonas Verstuyft - silhouette of mountain under white clouds
  '/images/daytext/u-fa73YB-Vono.jpg',
  // Sebastian Unrau - trees on forest with sun rays
  '/images/daytext/u-sp-p7uuT0tw.jpg',
  // Gigin Krishnan - Twilight over a dark lake with silhouetted peaks
  '/images/daytext/u-bFIQVZZxCd8.jpg',
  // Kyle Glenn - green leafed pine trees
  '/images/daytext/u-SrASYZZpyjw.jpg',
  // Akhil Lincoln - desert at night
  '/images/daytext/u-dSeQCOh_q7o.jpg',
  // Benjaminrobyn Jespersen - silhouette photo of mountain during nighttime
  '/images/daytext/u-syhd5N6nceM.jpg',
  // JOHN TOWNER - aerial photo of brown moutains
  '/images/daytext/u-JgOeRuGD_Y4.jpg',
  // Erik Adair - the night sky with stars and the milky
  '/images/daytext/u-TkGGO1r07NA.jpg',
  // Noah Grossenbacher - lighted house in city near glacier mountain at nighttime
  '/images/daytext/u-_7hiYkKVmsk.jpg',
  // Ben Griffiths - A single glowing light in the distance between dark silhouettes of pine trees
  '/images/daytext/u-l7R85WBKl1c.jpg',
  // Alexandr Podvalny - landscape photo of mountain during nighttime
  '/images/daytext/u-n_Jb_d8O43Q.jpg',
  // Thái Duy - looking up at trees and sky
  '/images/daytext/u-OfGa41jQNTM.jpg',
  // Hugo L. Casanova - a large body of water with a sunset in the background
  '/images/daytext/u--fl6GXZJugQ.jpg',
  // Jack Prommel - green trees on brown field during daytime
  '/images/daytext/u-nK4VdS1izPw.jpg',
  // brandon siu - icy mountains under starry night
  '/images/daytext/u-nI7knd5sQfo.jpg',
  // Colin Watts - a view of the night sky with the milky in the distance
  '/images/daytext/u-eYXrvDWeJWs.jpg',
  // Iain - Pier extending into ocean under a cloudy sky
  '/images/daytext/u-7VQ1nx3bpwA.jpg',
  // Didier Bn - water droplets on brown plant stem
  '/images/daytext/u-EO4J_XWPku4.jpg',
  // Taylor Burnfield - Pine tree branches are visible with water droplets
  '/images/daytext/u-0Tt7DizCW2I.jpg',
  // Dimitri Kolpakov - brown trees on forest during daytime
  '/images/daytext/u-vGseyazv2VM.jpg',
  // Emilio Garcia - the night sky is filled with stars and the milky
  '/images/daytext/u-1-zBIr0Cz44.jpg',
  // Caleb Sebastian - Dark mountains silhouette a lake with a beautiful sunset glow
  '/images/daytext/u-iNF9KBUYaxw.jpg',
  // Jr Korpa - low-angle photography of trees during night time
  '/images/daytext/u-_OQ8Jc7kBmA.jpg',
  // Roksolana Zasiadko - Dense evergreen trees emerging from thick grey mist on a mountain slope
  '/images/daytext/u-cf-ZRVtH6kE.jpg',
  '/images/daytext/1441974231531.jpg',
  // Haseeb Jamil - A snow-covered mountain peak under a dark night sky filled with bright stars
  '/images/daytext/u-3s85IxVDyXE.jpg',
  // Rachel Loughman - ocean waves crashing on shore during daytime
  '/images/daytext/u-ePOXA9cwxac.jpg',
  // James Owen - seashore under dark sky
  '/images/daytext/u-dzUtizbjiq4.jpg',
  // Emilio Garcia - the night sky is filled with stars and milky
  '/images/daytext/u-xaPsGyURv-c.jpg',
  // Joshua Woroniecki - silhouette of trees under blue sky
  '/images/daytext/u-0289jpHHk0o.jpg',
  // Phoebe Strafford - worms eye view of fog covered forest
  '/images/daytext/u-EBbP0Wrbmqs.jpg',
  // Pete Godfrey - green grass near wooden fence during sunset
  '/images/daytext/u-WmMvztKie48.jpg',
  // Iain - Sunset illuminates rock formations in the ocean
  '/images/daytext/u-vn0Z6-GTtZ4.jpg',
  // Raghav Yadav - view of mountain at night
  '/images/daytext/u-l7M7_tuqrZI.jpg',
  // Arturrro - misty forest
  '/images/daytext/u-x48QL8gNYZ8.jpg',
];

/**
 * The photo behind the card on a given day.
 *
 * Picked from the calendar day rather than at random, so it is stable across
 * re-renders - the card must not flicker through its backgrounds while the
 * dashboard re-paints - while still changing from one day to the next. Same
 * rule, and the same order, as `dailyVersePhoto` in the app's
 * `daily_verse_card.dart`, so both surfaces show the same picture on the same
 * day.
 */
export function dailyVersePhoto(date = new Date()): string {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return PHOTOS[((days % PHOTOS.length) + PHOTOS.length) % PHOTOS.length];
}
