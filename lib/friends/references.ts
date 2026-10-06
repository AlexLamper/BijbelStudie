/**
 * Turning a post's `reference` back into a link into the reader.
 *
 * A post is a copy (models/FriendPost.js): it stores "Psalm 23:1 - SV" as a
 * string, not a book id and a chapter, because what the kring saw must not
 * change when the underlying data does. So the one place that wants to link
 * back - "Veel gedeeld deze week" on the Ontdek tab - parses that string here,
 * once, rather than every component guessing at the format.
 *
 * Deliberately conservative: anything it cannot resolve to a book in the canon
 * and a chapter inside that book answers `null`, and the caller then renders
 * plain text. A reference that silently opened the wrong chapter would be
 * worse than one that is not a link.
 *
 * Its own module rather than a function in ./client, so `planCanon` and the
 * 66-book canon are not pulled into every component that imports the browser
 * client.
 */

import { BIBLE_CANON } from '../bibleProgress';
import { toBookCode } from '../bookCanon';

/**
 * Reader name and chapter count per canonical book code, built once.
 *
 * Keyed on the code rather than the name on purpose: the reference in a post
 * was written by whichever surface shared it, so it may spell the book the way
 * a translation does ("1 Corinthiers", "Psalmen"). `toBookCode` folds all of
 * those onto one key, which is exactly the job `lib/bookCanon.ts` exists for.
 */
const BY_CODE = new Map(
  BIBLE_CANON.flatMap((book) => {
    const code = toBookCode(book.name) ?? toBookCode(book.readerName);
    return code ? [[code, book] as const] : [];
  }),
);

/**
 * `"Jesaja 40:31"`, `"Psalm 23:1 - SV"`, `"1 Johannes 4"` -> the book name as
 * written and the chapter, or null when it is not a passage at all.
 *
 * The verse, the translation and anything after them are dropped: the reader
 * opens a chapter, so the verse number has nowhere to go.
 */
export function parseReference(reference: string | null | undefined): { book: string; chapter: number } | null {
  if (!reference) return null;
  // Everything up to the first chapter number is the book, which is the only
  // way to read "1 Johannes 4" and "Johannes 4" with one pattern.
  const match = /^\s*(\d?\s*[^\d]+?)\s+(\d{1,3})\b/.exec(reference);
  if (!match) return null;
  const chapter = Number.parseInt(match[2], 10);
  if (!Number.isFinite(chapter) || chapter < 1) return null;
  return { book: match[1].replace(/\s+/g, ' ').trim(), chapter };
}

/**
 * `/lezen?book=&chapter=` for a post's reference, or null when it does not
 * resolve to a real chapter.
 *
 * No `version`: a signed-in reader keeps their own translation, the rule
 * `chapterReaderHref` and `readerHref` already follow. The reader name is
 * taken from the canon, never from the reference itself - the data folders do
 * not use every translation's spelling.
 */
export function referenceReaderHref(reference: string | null | undefined): string | null {
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const code = toBookCode(parsed.book);
  const book = code ? BY_CODE.get(code) : undefined;
  if (!book || parsed.chapter > book.chapters) return null;
  return `/lezen?book=${encodeURIComponent(book.readerName)}&chapter=${parsed.chapter}`;
}
