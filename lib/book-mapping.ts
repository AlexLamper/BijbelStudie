export const bookNameMap: Record<string, string> = {
  // ── Dutch (Statenvertaling / HSV shared names) ────────────────
  'Genesis': 'Genesis',
  'Exodus': 'Exodus',
  'Leviticus': 'Leviticus',
  'Numeri': 'Numbers',
  'Deuteronomium': 'Deuteronomy',
  'Jozua': 'Joshua',
  'Richteren': 'Judges',
  'Ruth': 'Ruth',
  '1 Samuel': '1 Samuel',
  '1 Samuël': '1 Samuel',       // statenvertaling variant (diacritic)
  '2 Samuel': '2 Samuel',
  '2 Samuël': '2 Samuel',       // statenvertaling variant (diacritic)
  '1 Koningen': '1 Kings',
  '2 Koningen': '2 Kings',
  '1 Kronieken': '1 Chronicles',
  '2 Kronieken': '2 Chronicles',
  'Ezra': 'Ezra',
  'Nehemia': 'Nehemiah',
  'Esther': 'Esther',
  'Job': 'Job',
  'Psalmen': 'Psalms',
  'Spreuken': 'Proverbs',
  'Prediker': 'Ecclesiastes',
  'Hooglied': 'Song of Solomon',
  'Jesaja': 'Isaiah',
  'Jeremia': 'Jeremiah',
  'Klaagliederen': 'Lamentations',
  'Ezechiël': 'Ezekiel',
  'Daniel': 'Daniel',
  'Daniël': 'Daniel',           // statenvertaling variant (diacritic)
  'Hosea': 'Hosea',
  'Joël': 'Joel',
  'Amos': 'Amos',
  'Obadja': 'Obadiah',
  'Jona': 'Jonah',
  'Micha': 'Micah',
  'Nahum': 'Nahum',
  'Habakuk': 'Habakkuk',
  'Zefanja': 'Zephaniah',
  'Haggai': 'Haggai',
  'Haggaï': 'Haggai',           // statenvertaling variant (diacritic)
  'Zacharia': 'Zechariah',
  'Maleachi': 'Malachi',
  'Mattheüs': 'Matthew',
  'Markus': 'Mark',
  'Lukas': 'Luke',
  'Johannes': 'John',
  'Handelingen': 'Acts',
  'Romeinen': 'Romans',
  '1 Korinthe': '1 Corinthians',
  '1 Corinthiërs': '1 Corinthians', // statenvertaling variant
  '2 Korinthe': '2 Corinthians',
  '2 Corinthiër': '2 Corinthians',  // statenvertaling variant
  'Galaten': 'Galatians',
  'Efeze': 'Ephesians',
  'Efeziërs': 'Ephesians',      // statenvertaling variant
  'Filippenzen': 'Philippians',
  'Kolossenzen': 'Colossians',
  'Colossenzen': 'Colossians',  // statenvertaling variant
  '1 Thessalonica': '1 Thessalonians',
  '1 Thessalonicenzen': '1 Thessalonians', // statenvertaling variant
  '2 Thessalonica': '2 Thessalonians',
  '2 Thessalonicenzen': '2 Thessalonians', // statenvertaling variant
  '1 Timotheüs': '1 Timothy',
  '2 Timotheüs': '2 Timothy',
  'Titus': 'Titus',
  'Filemon': 'Philemon',
  'Filémon': 'Philemon',        // statenvertaling variant (accent)
  'Hebreeën': 'Hebrews',
  'Jakobus': 'James',
  '1 Petrus': '1 Peter',
  '2 Petrus': '2 Peter',
  '1 Johannes': '1 John',
  '2 Johannes': '2 John',
  '3 Johannes': '3 John',
  'Judas': 'Jude',
  'Openbaring': 'Revelation',

  // ── Deuterocanonical books (Canisiusbijbel 1939) ──────────────
  'Tobit': 'Tobit',
  'Judit': 'Judith',
  '1 Makkabeeën': '1 Maccabees',
  '2 Makkabeeën': '2 Maccabees',
  'Wijsheid': 'Wisdom',
  'Wijsheid van Jezus Sirach': 'Sirach',
  'Baruch': 'Baruch',
  'Daniël (Grieks)': 'Daniel (Greek)',

  // ── German (Elberfelder 1905 / Luther 1912 / Schlachter 2000) ─
  '1 Mose': 'Genesis',
  '2 Mose': 'Exodus',
  '3 Mose': 'Leviticus',
  '4 Mose': 'Numbers',
  '5 Mose': 'Deuteronomy',
  'Josua': 'Joshua',
  'Richter': 'Judges',
  'Rut': 'Ruth',
  'Esra': 'Ezra',
  'Ester': 'Esther',
  'Psalm': 'Psalms',
  'Sprueche': 'Proverbs',
  'Prediger': 'Ecclesiastes',
  'Hohelied': 'Song of Solomon',
  'Hesekiel': 'Ezekiel',
  'Joel': 'Joel',
  'Mica': 'Micah',
  'Sacharja': 'Zechariah',
  'Zephanja': 'Zephaniah',
  'Matthaeus': 'Matthew',
  'Apostelgeschichte': 'Acts',
  'Roemers': 'Romans',
  '1 Korinther': '1 Corinthians',
  '2 Korinther': '2 Corinthians',
  'Galater': 'Galatians',
  'Epheser': 'Ephesians',
  'Philipper': 'Philippians',
  'Kolosser': 'Colossians',
  '1 Thessalonicher': '1 Thessalonians',
  '2 Thessalonicher': '2 Thessalonians',
  '1 Timotheus': '1 Timothy',
  '2 Timotheus': '2 Timothy',
  'Philemon': 'Philemon',
  'Hebraeer': 'Hebrews',
  'Klagelieder': 'Lamentations',
  'Offenbarung': 'Revelation',
};

// Create reverse map (English to Dutch)
// Note: insertion order matters - last Dutch key wins; German entries may overwrite.
// Use CANONICAL_NL for reliable English→Dutch display names instead.
export const englishToDutchMap: Record<string, string> = Object.entries(bookNameMap).reduce((acc, [dutch, english]) => {
    acc[english] = dutch;
    return acc;
}, {} as Record<string, string>);

/**
 * Authoritative English → canonical Dutch book names, matching the Statenvertaling
 * folder names exactly. Use this for displaying English-keyed translations (HSV, BasisBijbel).
 */
export const CANONICAL_NL: Record<string, string> = {
  'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus',
  'Numbers': 'Numeri', 'Deuteronomy': 'Deuteronomium', 'Joshua': 'Jozua',
  'Judges': 'Richteren', 'Ruth': 'Ruth', '1 Samuel': '1 Samuël',
  '2 Samuel': '2 Samuël', '1 Kings': '1 Koningen', '2 Kings': '2 Koningen',
  '1 Chronicles': '1 Kronieken', '2 Chronicles': '2 Kronieken',
  'Ezra': 'Ezra', 'Nehemiah': 'Nehemia', 'Esther': 'Esther', 'Job': 'Job',
  'Psalms': 'Psalmen', 'Proverbs': 'Spreuken', 'Ecclesiastes': 'Prediker',
  'Song of Solomon': 'Hooglied', 'Isaiah': 'Jesaja', 'Jeremiah': 'Jeremia',
  'Lamentations': 'Klaagliederen', 'Ezekiel': 'Ezechiël', 'Daniel': 'Daniël',
  'Hosea': 'Hosea', 'Joel': 'Joël', 'Amos': 'Amos', 'Obadiah': 'Obadja',
  'Jonah': 'Jona', 'Micah': 'Micha', 'Nahum': 'Nahum', 'Habakkuk': 'Habakuk',
  'Zephaniah': 'Zefanja', 'Haggai': 'Haggaï', 'Zechariah': 'Zacharia',
  'Malachi': 'Maleachi', 'Matthew': 'Mattheüs', 'Mark': 'Markus',
  'Luke': 'Lukas', 'John': 'Johannes', 'Acts': 'Handelingen',
  'Romans': 'Romeinen', '1 Corinthians': '1 Corinthiërs',
  '2 Corinthians': '2 Corinthiër', 'Galatians': 'Galaten',
  'Ephesians': 'Efeziërs', 'Philippians': 'Filippenzen',
  'Colossians': 'Colossenzen', '1 Thessalonians': '1 Thessalonicenzen',
  '2 Thessalonians': '2 Thessalonicenzen', '1 Timothy': '1 Timotheüs',
  '2 Timothy': '2 Timotheüs', 'Titus': 'Titus', 'Philemon': 'Filémon',
  'Hebrews': 'Hebreeën', 'James': 'Jakobus', '1 Peter': '1 Petrus',
  '2 Peter': '2 Petrus', '1 John': '1 Johannes', '2 John': '2 Johannes',
  '3 John': '3 Johannes', 'Jude': 'Judas', 'Revelation': 'Openbaring',
};

export function normalizeBookName(name: string): string {
    return bookNameMap[name] || name;
}

export function getBookNameVariants(name: string): string[] {
    const variants = new Set<string>();
    variants.add(name);

    if (bookNameMap[name]) {
        variants.add(bookNameMap[name]);
    }

    if (englishToDutchMap[name]) {
        variants.add(englishToDutchMap[name]);
    }

    return Array.from(variants);
}

export const BIBLE_BOOKS_ORDER = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation'
];

export function getBookNameFromNumber(number: number): string {
    if (number < 1 || number > BIBLE_BOOKS_ORDER.length) {
        return 'Unknown';
    }
    return BIBLE_BOOKS_ORDER[number - 1];
}

/* ─── Reader deep links ──────────────────────────────────────────
 * Links into /lezen come from outside (BijbelQuiz, shared URLs, mail) and
 * spell books however the sender does: "Hebreeën", "1 Korinthe",
 * "1-korintiers", "Hebrews", "HEB". Each translation folder, on the other hand,
 * has exactly one spelling ("2 Corinthiër", "Filémon", "Haggaï" in the
 * Statenvertaling; English names in KJV). Matching the raw string made every
 * link that did not use the exact folder name open Genesis 1 instead.
 */

/** OSIS-style codes (as in lib/bookCanon.ts), in BIBLE_BOOKS_ORDER order. */
const OSIS_CODES = [
  'GEN', 'EXOD', 'LEV', 'NUM', 'DEUT', 'JOSH', 'JUDG', 'RUTH', '1SAM', '2SAM',
  '1KGS', '2KGS', '1CHR', '2CHR', 'EZRA', 'NEH', 'ESTH', 'JOB', 'PS', 'PROV',
  'ECCL', 'SONG', 'ISA', 'JER', 'LAM', 'EZEK', 'DAN', 'HOS', 'JOEL', 'AMOS',
  'OBAD', 'JONAH', 'MIC', 'NAH', 'HAB', 'ZEPH', 'HAG', 'ZECH', 'MAL',
  'MATT', 'MARK', 'LUKE', 'JOHN', 'ACTS', 'ROM', '1COR', '2COR', 'GAL', 'EPH',
  'PHIL', 'COL', '1THESS', '2THESS', '1TIM', '2TIM', 'TITUS', 'PHLM', 'HEB', 'JAS',
  '1PET', '2PET', '1JOHN', '2JOHN', '3JOHN', 'JUDE', 'REV',
];

/** Spellings used elsewhere (NBV, NBG, BijbelQuiz) that no folder uses. */
const EXTRA_SPELLINGS: Record<string, string> = {
  'Rechters': 'Judges',
  'Psalm': 'Psalms',
  'Ester': 'Esther',
  'Sefanja': 'Zephaniah',
  'Matteüs': 'Matthew',
  'Marcus': 'Mark',
  'Lucas': 'Luke',
  'Handelingen der Apostelen': 'Acts',
  '1 Korintiërs': '1 Corinthians',
  '2 Korintiërs': '2 Corinthians',
  '1 Korinthiërs': '1 Corinthians',
  '2 Korinthiërs': '2 Corinthians',
  '2 Corinthiërs': '2 Corinthians',
  '1 Tessalonicenzen': '1 Thessalonians',
  '2 Tessalonicenzen': '2 Thessalonians',
  '1 Timoteüs': '1 Timothy',
  '2 Timoteüs': '2 Timothy',
  'Hebreeen': 'Hebrews',
  'Openbaringen': 'Revelation',
  'Song of Songs': 'Song of Solomon',
};

/** Lowercase, no diacritics, no spaces/dots/dashes/underscores/plus signs. */
function foldBookName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s._+-]/g, '');
}

let foldedToEnglish: Map<string, string> | null = null;

function getFoldedMap(): Map<string, string> {
  if (foldedToEnglish) return foldedToEnglish;
  const map = new Map<string, string>();
  const add = (name: string, english: string) => {
    const key = foldBookName(name);
    if (key && !map.has(key)) map.set(key, english);
  };
  BIBLE_BOOKS_ORDER.forEach((english, i) => {
    add(english, english);
    add(OSIS_CODES[i], english);
  });
  Object.entries(CANONICAL_NL).forEach(([english, dutch]) => add(dutch, english));
  Object.entries(bookNameMap).forEach(([name, english]) => add(name, english));
  Object.entries(EXTRA_SPELLINGS).forEach(([name, english]) => add(name, english));
  foldedToEnglish = map;
  return map;
}

/**
 * The canonical English name (a BIBLE_BOOKS_ORDER entry, or a deuterocanonical
 * name) for any spelling of a book, or null when unrecognised.
 */
export function canonicalBookName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (bookNameMap[trimmed]) return bookNameMap[trimmed];
  return getFoldedMap().get(foldBookName(trimmed)) ?? null;
}

/**
 * The entry of `bookList` (one translation's own folder names) that `name`
 * refers to, whatever spelling `name` uses. Null when nothing matches.
 */
export function resolveBookInList(name: string | null | undefined, bookList: readonly string[]): string | null {
  if (!name) return null;
  if (bookList.includes(name)) return name;
  const target = canonicalBookName(name);
  if (!target) return null;
  return bookList.find(book => canonicalBookName(book) === target) ?? null;
}
