export const bookNameMap: Record<string, string> = {
  // ── Dutch (Statenvertaling / HSV shared names) ────────────────
  'Genesis': 'Genesis',
  'Exodus': 'Exodus',
  'Leviticus': 'Leviticus',
  'Numeri': 'Numbers',
  'Numberi': 'Numbers',          // statenvertaling variant
  'Deuteronomium': 'Deuteronomy',
  'Jozua': 'Joshua',
  'Richteren': 'Judges',
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
// Note: insertion order matters — last Dutch key wins; German entries may overwrite.
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
  'Numbers': 'Numberi', 'Deuteronomy': 'Deuteronomium', 'Joshua': 'Jozua',
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
