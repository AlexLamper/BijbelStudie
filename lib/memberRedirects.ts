/**
 * Where a signed-in member goes instead of the public reference pages.
 *
 * /bijbelboeken, /bijbelboeken/<slug> and /bijbel/<slug>/<chapter> exist for
 * Google and for signed-out visitors: they sit in a marketing-style shell
 * (components/content/ContentShell.tsx) with no rail and no progress. A member
 * who reaches one through an old link or a search result is sent to the page
 * inside the app that does the same job. Guests and crawlers are untouched -
 * same HTML, same cache - so this is an ordinary "members go to the app"
 * redirect, not a second version of the page for Google.
 *
 *   /bijbelboeken                  -> /profiel/bijbel
 *        The dashboard's own "Bijbelboeken" card: all 66 books, each opening
 *        to its chapters, each chapter opening in the reader.
 *   /bijbelboeken/<slug>           -> /studies/<study id>
 *        The book's study page: what the book is about, one lesson per
 *        chapter with the outline section it falls in, and where the member
 *        is in it. Same study the /studies catalogue shows for that book.
 *   /bijbel/<slug>/<chapter>       -> /lezen?book=<reader key>&chapter=<n>
 *        The reader at that chapter. No `version`: without one /lezen opens
 *        the member's own translation (last read, then their preference,
 *        then the Statenvertaling), and resolves the book in it.
 *
 * EDGE-SAFE BY CONSTRUCTION: this module imports nothing. middleware.ts runs
 * on the Edge runtime for every page request, and lib/content/bibleBooks is
 * ~150 KB of book introductions that the middleware bundle must never carry.
 * The table below is therefore a copy, and tests/memberRedirects.test.ts
 * holds it to lib/content/bibleBooks (slug, reader key, chapter count, order)
 * and to lib/bookStudies (study id), so a change there fails the tests
 * instead of redirecting to a 404.
 *
 * Anything that does not name a real page returns null, so an unknown slug or
 * an out-of-range chapter still gets the static 404 instead of a redirect.
 */

/** [slug, chapters, reader key] - the reader key is `readerBookName(book)`. */
type BookRow = readonly [slug: string, chapters: number, readerName: string];

/** The 66 books in canonical order, as lib/content/bibleBooks has them. */
export const MEMBER_REDIRECT_BOOKS: readonly BookRow[] = [
  ["genesis", 50, "Genesis"],
  ["exodus", 40, "Exodus"],
  ["leviticus", 27, "Leviticus"],
  ["numeri", 36, "Numeri"],
  ["deuteronomium", 34, "Deuteronomium"],
  ["jozua", 24, "Jozua"],
  ["richteren", 21, "Richteren"],
  ["ruth", 4, "Ruth"],
  ["1-samuel", 31, "1 Samuël"],
  ["2-samuel", 24, "2 Samuël"],
  ["1-koningen", 22, "1 Koningen"],
  ["2-koningen", 25, "2 Koningen"],
  ["1-kronieken", 29, "1 Kronieken"],
  ["2-kronieken", 36, "2 Kronieken"],
  ["ezra", 10, "Ezra"],
  ["nehemia", 13, "Nehemia"],
  ["esther", 10, "Esther"],
  ["job", 42, "Job"],
  ["psalmen", 150, "Psalmen"],
  ["spreuken", 31, "Spreuken"],
  ["prediker", 12, "Prediker"],
  ["hooglied", 8, "Hooglied"],
  ["jesaja", 66, "Jesaja"],
  ["jeremia", 52, "Jeremia"],
  ["klaagliederen", 5, "Klaagliederen"],
  ["ezechiel", 48, "Ezechiël"],
  ["daniel", 12, "Daniël"],
  ["hosea", 14, "Hosea"],
  ["joel", 3, "Joël"],
  ["amos", 9, "Amos"],
  ["obadja", 1, "Obadja"],
  ["jona", 4, "Jona"],
  ["micha", 7, "Micha"],
  ["nahum", 3, "Nahum"],
  ["habakuk", 3, "Habakuk"],
  ["zefanja", 3, "Zefanja"],
  ["haggai", 2, "Haggaï"],
  ["zacharia", 14, "Zacharia"],
  ["maleachi", 4, "Maleachi"],
  ["mattheus", 28, "Mattheüs"],
  ["markus", 16, "Markus"],
  ["lukas", 24, "Lukas"],
  ["johannes", 21, "Johannes"],
  ["handelingen", 28, "Handelingen"],
  ["romeinen", 16, "Romeinen"],
  ["1-corinthiers", 16, "1 Corinthiërs"],
  // The Statenvertaling data keys this book without the final s (see the
  // naming rule in lib/content/bibleBooks/types.ts).
  ["2-corinthiers", 13, "2 Corinthiër"],
  ["galaten", 6, "Galaten"],
  ["efeziers", 6, "Efeziërs"],
  ["filippenzen", 4, "Filippenzen"],
  ["colossenzen", 4, "Colossenzen"],
  ["1-thessalonicenzen", 5, "1 Thessalonicenzen"],
  ["2-thessalonicenzen", 3, "2 Thessalonicenzen"],
  ["1-timotheus", 6, "1 Timotheüs"],
  ["2-timotheus", 4, "2 Timotheüs"],
  ["titus", 3, "Titus"],
  ["filemon", 1, "Filémon"],
  ["hebreeen", 13, "Hebreeën"],
  ["jakobus", 5, "Jakobus"],
  ["1-petrus", 5, "1 Petrus"],
  ["2-petrus", 3, "2 Petrus"],
  ["1-johannes", 5, "1 Johannes"],
  ["2-johannes", 1, "2 Johannes"],
  ["3-johannes", 1, "3 Johannes"],
  ["judas", 1, "Judas"],
  ["openbaring", 22, "Openbaring"],
];

const BY_SLUG = new Map(MEMBER_REDIRECT_BOOKS.map(row => [row[0], row]));

/**
 * Books whose catalogue study is an authored one rather than the generated
 * `boek-<slug>` (lib/bookStudies: AUTHORED_BY_BOOK). The member lands on the
 * study the catalogue lists, which is where their enrollment lives.
 */
const AUTHORED_BOOK_STUDIES: Readonly<Record<string, string>> = {
  daniel: "daniel",
};

/** In-app replacement for /bijbelboeken. */
export const MEMBER_BOOKS_INDEX_PATH = "/profiel/bijbel";

/** The study id /studies lists for a book: `boek-<slug>` unless authored. */
export function memberBookStudyId(slug: string): string {
  return AUTHORED_BOOK_STUDIES[slug] ?? `boek-${slug}`;
}

/** The reader at a chapter, in the member's own translation. */
export function memberReaderHref(readerName: string, chapter: number): string {
  return `/lezen?book=${encodeURIComponent(readerName)}&chapter=${chapter}`;
}

const BOOK_PAGE = /^\/bijbelboeken\/([a-z0-9-]+)$/;
// Same strictness as resolveChapterPage in lib/chapterPages.ts: "01", "1.0"
// or "+1" is not a page, so it is not redirected either.
const CHAPTER_PAGE = /^\/bijbel\/([a-z0-9-]+)\/([1-9]\d{0,2})$/;

/**
 * The in-app path a signed-in member should get for `pathname`, or null when
 * the path is not one of the three public reference routes (or does not name
 * a real page of them). Pure; the caller decides whether the visitor is signed
 * in. A single trailing slash is tolerated; the query string is not part of
 * `pathname` and is not carried over.
 */
export function memberRedirectFor(pathname: string): string | null {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (path === "/bijbelboeken") return MEMBER_BOOKS_INDEX_PATH;

  const bookPage = BOOK_PAGE.exec(path);
  if (bookPage) {
    return BY_SLUG.has(bookPage[1]) ? `/studies/${memberBookStudyId(bookPage[1])}` : null;
  }

  const chapterPage = CHAPTER_PAGE.exec(path);
  if (chapterPage) {
    const book = BY_SLUG.get(chapterPage[1]);
    const chapter = Number(chapterPage[2]);
    if (!book || chapter > book[1]) return null;
    return memberReaderHref(book[2], chapter);
  }

  return null;
}
