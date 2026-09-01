/**
 * Where the paywall actually lives.
 *
 * Until this file existed, every Pro benefit was enforced in the client and
 * nowhere else: `CommentaryComponent` hid long commentary behind a mask,
 * `OriginalText` sliced the verse list to one, and `study_screen.dart` swapped
 * the grondtekst pane for a wall. The APIs underneath served the full text to
 * anyone who asked, with or without a token - `curl` against
 * `/api/v1/original/Genesis/1` returned 31 KB of Hebrew, and
 * `/api/commentary?...` returned 60 KB of Matthew Henry. A paywall a `fetch`
 * can walk around is a suggestion, not a paywall.
 *
 * The policy below is deliberately the same as the one the clients already
 * implemented, so nothing a paying or non-paying user sees changes shape - the
 * difference is that the bytes a free user is not entitled to now never leave
 * the server.
 *
 * **Preview, not refusal.** These functions truncate rather than throw. A 403
 * would be simpler, but the preview is what sells the subscription: the reader
 * sees the first verse of the grondtekst and the opening of the commentary, and
 * the paywall sits under it with the price. Returning nothing would make the
 * gate cheaper to implement and much worse at its job.
 *
 * @see lib/mobileLicensing.ts for the other content gate. That one is about
 * what may be shipped at all; this one is about who has paid.
 */

/**
 * Characters of commentary a free reader gets.
 *
 * 1200 is not arbitrary: it is the threshold `CommentaryComponent` has always
 * used to decide whether a chapter is long enough to be worth paywalling, and
 * keeping the two equal means short commentaries stay fully free exactly as
 * they were.
 */
export const FREE_COMMENTARY_CHARS = 1200;

/** Verses of grondtekst a free reader gets, matching `OriginalText`'s slice. */
export const FREE_ORIGINAL_VERSES = 1;

/**
 * KingComments is free for everyone, in every variant (`kingcomments_nl` and
 * anything else that starts the same way). It is licensed on that basis, so
 * this is a licensing fact rather than a pricing decision.
 */
export function isAlwaysFreeCommentary(commentaryId: string): boolean {
  return commentaryId.toLowerCase().startsWith('kingcomments');
}

export type Gated<T> = {
  items: T[];
  /** True when something was withheld, which is what the client renders a paywall over. */
  locked: boolean;
};

/**
 * Trims a chapter of commentary to the free allowance.
 *
 * Whole entries are kept while the budget allows and the entry that overruns it
 * is cut mid-text. Keeping only whole entries would be tidier to read but would
 * hand a free user the entirety of any single long introduction, which on
 * Matthew Henry is most of the chapter - the cap has to bind on characters, not
 * on entry count.
 *
 * A chapter whose total is already within the allowance is returned untouched
 * and unlocked, so a two-line note never sprouts a paywall.
 */
export function gateCommentary<T>(
  items: T[],
  textOf: (item: T) => string,
  withText: (item: T, text: string) => T,
  options: { commentaryId: string; isPro: boolean },
): Gated<T> {
  if (options.isPro || isAlwaysFreeCommentary(options.commentaryId)) {
    return { items, locked: false };
  }

  const total = items.reduce((sum, item) => sum + textOf(item).length, 0);
  if (total <= FREE_COMMENTARY_CHARS) return { items, locked: false };

  const kept: T[] = [];
  let budget = FREE_COMMENTARY_CHARS;

  for (const item of items) {
    if (budget <= 0) break;
    const text = textOf(item);
    if (text.length <= budget) {
      kept.push(item);
      budget -= text.length;
    } else {
      kept.push(withText(item, text.slice(0, budget)));
      budget = 0;
    }
  }

  return { items: kept, locked: true };
}

/**
 * Trims a chapter of original-language text to the free allowance.
 *
 * Unlike commentary there is no "short enough to be free" case: a chapter of
 * Hebrew with its transliteration and Strong's numbers is the product, and the
 * shortest one still is.
 */
export function gateOriginal<T>(verses: T[], options: { isPro: boolean }): Gated<T> {
  if (options.isPro) return { items: verses, locked: false };
  if (verses.length <= FREE_ORIGINAL_VERSES) return { items: verses, locked: false };
  return { items: verses.slice(0, FREE_ORIGINAL_VERSES), locked: true };
}
