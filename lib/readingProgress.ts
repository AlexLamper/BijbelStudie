/**
 * Guards for the `readChapters` map on the user document.
 *
 * Both last-read routes build a Mongo update path by interpolating the book name
 * from the request body:
 *
 *   { $addToSet: { [`readChapters.${book}`]: chapter } }
 *
 * so the caller chooses the key. A `$`-prefixed or dotted name therefore writes
 * somewhere other than the intended book, and the map is typed `of: [Number]` -
 * a key holding anything else makes Mongoose reject `user.save()` for the
 * *entire* document from then on. That is not theoretical: a stray `$*` key on a
 * live account made every write to that user throw, including the one that
 * grants Pro access after a successful payment.
 *
 * The check is structural, not a canon lookup. Book names carry spaces and
 * diacritics and differ per translation, so rejecting unrecognised names would
 * break real reading progress; rejecting Mongo's own metacharacters costs
 * nothing and closes the hole.
 */

/** Longest book name in the canon is well under this. */
const MAX_BOOK_KEY_LENGTH = 64;

/** Highest chapter number in the canon is Psalm 150. */
const MAX_CHAPTER = 200;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function isSafeBookKey(book: unknown): book is string {
  return (
    typeof book === "string" &&
    book.length > 0 &&
    book.length <= MAX_BOOK_KEY_LENGTH &&
    !book.startsWith("$") &&
    !book.includes(".") &&
    // Control characters would survive into the key and render as mojibake.
    !CONTROL_CHARS.test(book)
  );
}

export function isSafeChapter(chapter: unknown): chapter is number {
  return (
    typeof chapter === "number" &&
    Number.isInteger(chapter) &&
    chapter >= 1 &&
    chapter <= MAX_CHAPTER
  );
}
