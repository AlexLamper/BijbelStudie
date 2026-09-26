/**
 * The repair update for a stored `readChapters` map that Mongoose cannot
 * hydrate (see `readChaptersFrom` / `unreadableBookKeys` in
 * lib/readChaptersCanon.ts for why one bad key hides every book).
 *
 * WHY A PIPELINE AND NOT `$set: { readChapters: stored }`.
 *
 * The repair used to write the whole map back from what the GET had just read.
 * That is a read-modify-write across two round trips: a `$addToSet` from
 * `POST /last-read` landing in between (the reader has the app open on another
 * device, or the dashboard loads while a chapter is being marked) was silently
 * overwritten, and CLAUDE.md forbids replacing the whole map for exactly that
 * reason.
 *
 * This builds an update PIPELINE instead. It names only the broken keys and is
 * evaluated by MongoDB against the document as it is at write time, so every
 * other key - including one added a millisecond ago - is untouched. Per key:
 *
 *  - a key that cannot stand for a book (`$`-prefixed like the literal `$*`
 *    schema-path key, dotted, or empty) is removed with `$unsetField`. It can
 *    not be addressed with an ordinary `readChapters.<key>` path at all, which
 *    is why this is not a plain `$unset`;
 *  - a readable key whose value is not a clean chapter list keeps the chapters
 *    it does have: an array is filtered down to its positive integers
 *    server-side, anything that is not an array is removed (it never held a
 *    chapter list).
 *
 * Pure: no database import. Needs MongoDB 5.0+ (`$getField` / `$setField` /
 * `$unsetField`); callers must treat a failure as "not repaired this time",
 * never as a failed read.
 */

import { unreadableBookKeys } from './readChaptersCanon';

/** Mongo expression for a field name, safe for `$`-prefixed and dotted names. */
function literal(key: string) {
  return { $literal: key };
}

function isReadableBookKey(key: string): boolean {
  return key.length > 0 && !key.startsWith('$') && !key.includes('.');
}

/**
 * The same test as `isChapterList` in lib/readChaptersCanon.ts, server-side:
 * a positive, safe integer, never evaluating `$trunc` on a non-number.
 * `$isNumber` alone is not enough - it also passes decimal128, which a
 * `.lean()` read hands back as an object, so the key would be flagged broken
 * again on every read and "repaired" forever. The upper bound drops
 * Infinity and a Long beyond 2^53 (read back as a Long object) for the same
 * reason.
 */
const IS_CHAPTER = {
  $cond: [
    { $in: [{ $type: '$$n' }, ['int', 'long', 'double']] },
    {
      $and: [
        { $gte: ['$$n', 1] },
        { $lte: ['$$n', Number.MAX_SAFE_INTEGER] },
        { $eq: ['$$n', { $trunc: ['$$n', 0] }] },
      ],
    },
    false,
  ],
};

/**
 * The update pipeline that repairs only the broken keys of `raw` (the stored
 * `readChapters` value off a `.lean()` read), or null when nothing is broken.
 *
 * Use as `User.updateOne({ _id }, pipeline)`.
 */
export function readChaptersRepairPipeline(raw: unknown): Record<string, unknown>[] | null {
  const broken = unreadableBookKeys(raw);
  if (broken.length === 0) return null;

  let expr: unknown = '$readChapters';
  for (const key of broken) {
    if (!isReadableBookKey(key)) {
      expr = { $unsetField: { field: literal(key), input: expr } };
      continue;
    }
    const current = { $getField: { field: literal(key), input: '$readChapters' } };
    expr = {
      $cond: [
        { $isArray: current },
        {
          $setField: {
            field: literal(key),
            input: expr,
            value: { $filter: { input: current, as: 'n', cond: IS_CHAPTER } },
          },
        },
        { $unsetField: { field: literal(key), input: expr } },
      ],
    };
  }

  // Evaluated at write time: if readChapters is no longer an object (removed,
  // or replaced by something else since the read), leave it exactly as it is
  // rather than let $getField/$setField fail or build a map from nothing.
  return [
    {
      $set: {
        readChapters: { $cond: [{ $eq: [{ $type: '$readChapters' }, 'object'] }, expr, '$readChapters'] },
      },
    },
  ];
}
