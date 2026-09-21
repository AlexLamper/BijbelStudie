import { normaliseBookName, toBookCode, type BookCode } from './bookCanon';

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

/* ─── Deep-link book resolution ───────────────────────────────────────────── */

/**
 * One book, named by anything anyone has ever sent us.
 *
 * A reader link carries a book NAME, and every source spells it differently:
 * bijbelquiz sends "1 Korinthe", the Statenvertaling folder is "1 Corinthiërs",
 * a shared URL may carry the slug "1-korintiers", and the English translations
 * use "1 Corinthians". The reader used to compare these with `includes()`, so a
 * link whose spelling did not match the chosen translation's own label silently
 * dropped the reader in Genesis 1.
 *
 * Everything below resolves to the ENGLISH canonical name (`BIBLE_BOOKS_ORDER`),
 * which is the one list every translation can be mapped onto.
 *
 * Built on `bookNameMap` plus `lib/bookCanon.ts` rather than a fourth table:
 * bookCanon is duplicated byte for byte in bijbelquiz and must not grow a
 * bijbelstudie-only entry, so the spellings it lacks are added here instead.
 */

/** Every spelling we know, normalised, pointing at the English canonical name. */
const SPELLINGS = new Map<string, string>();

function learn(spelling: string, english: string): void {
  const key = normaliseBookName(spelling.replace(/[-_]+/g, ' '));
  if (key && !SPELLINGS.has(key)) SPELLINGS.set(key, english);
}

for (const english of BIBLE_BOOKS_ORDER) {
  learn(english, english);
  const dutch = CANONICAL_NL[english];
  if (dutch) learn(dutch, english);
}
for (const [spelling, english] of Object.entries(bookNameMap)) {
  // The deuterocanonical entries map to names outside the 66, and a reader link
  // to one of those has no canonical answer - better null than a wrong book.
  if (BIBLE_BOOKS_ORDER.includes(english)) learn(spelling, english);
}

/**
 * Spellings that occur in public/data/books-index.json and are missing from
 * `bookNameMap` - the four the German editions use for Kings and Chronicles.
 *
 * Deliberately NOT added to `bookNameMap` itself: `englishToDutchMap` is folded
 * out of that object with the last key winning, so a German entry there takes
 * "1 Kings" away from "1 Koningen" and `getBookNameVariants` stops offering the
 * Dutch folder name that lib/local-data.ts looks files up by.
 */
const EXTRA_SPELLINGS: Record<string, string> = {
  '1 Koenige': '1 Kings',
  '2 Koenige': '2 Kings',
  '1 Chronik': '1 Chronicles',
  '2 Chronik': '2 Chronicles',
};
for (const [spelling, english] of Object.entries(EXTRA_SPELLINGS)) learn(spelling, english);

/**
 * Code -> English canonical name, so a bare code in a URL ("2COR") still finds
 * its book.
 *
 * Derived by asking bookCanon about EVERY spelling of each book rather than
 * about its canonical Dutch name alone. The Statenvertaling calls 2 Corinthians
 * "2 Corinthiër" without the final s, which bookCanon does not list - so going
 * through the canonical name only would have left that one book with no code at
 * all, and silently.
 */
const CODE_TO_ENGLISH = new Map<BookCode, string>();
for (const [spelling, english] of SPELLINGS) {
  const code = toBookCode(spelling);
  if (code && !CODE_TO_ENGLISH.has(code)) CODE_TO_ENGLISH.set(code, english);
}

/**
 * The English canonical name for any spelling, or null when it is not one of
 * the 66 books.
 *
 * Null rather than a best guess: a wrong match sends someone to a different
 * book than the link promised, which is worse than the fallback.
 */
export function canonicalBookName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) return null;

  const known = SPELLINGS.get(normaliseBookName(cleaned));
  if (known) return known;

  // Dutch spellings bookCanon knows and this file does not ("1 Korintiërs").
  const code = toBookCode(cleaned);
  if (code) return CODE_TO_ENGLISH.get(code) ?? null;

  // A bare code, the way bijbelquiz passes one around ("HEB", "2COR").
  return CODE_TO_ENGLISH.get(cleaned.toUpperCase().replace(/\s+/g, '')) ?? null;
}

/**
 * The entry of `list` that is this book, spelled the way that list spells it.
 *
 * `list` is one translation's book list out of public/data/books-index.json, so
 * the answer is a string the reader can put straight in a path - which is the
 * whole point: resolving the name and then using the caller's spelling would
 * 404 on the chapters file.
 */
export function resolveBookInList(
  input: string | null | undefined,
  list: readonly string[] | null | undefined,
): string | null {
  if (!input || !list?.length) return null;

  // An exact hit first: it costs one comparison and it is the common case.
  if (list.includes(input)) return input;

  const target = canonicalBookName(input);
  if (!target) return null;
  return list.find((entry) => canonicalBookName(entry) === target) ?? null;
}
