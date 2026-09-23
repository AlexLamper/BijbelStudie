import connectMongoDB from './mongodb';
import Note from '../models/Note';
import { grantXp, type GrantResult } from './gamification';
import { FREE_NOTE_LIMIT } from './entitlements';

/**
 * XP for writing an aantekening.
 *
 * "Notes & reflection" is one of the four activities the Levensboom is fed by,
 * and it was the only one with no XP event. It is
 * also the one that is trivially farmable - a note is a text field and a save
 * button - so the guardrails are the point, not an afterthought:
 *
 * - creates only, never edits (an edit is not a second reflection);
 * - a real sentence, not a keystroke: MIN_LENGTH characters of note text;
 * - at most DAILY_CAP paid notes per calendar day.
 *
 * The daily cap is counted from the notes themselves rather than from a new
 * counter on the user: there is nothing to migrate, nothing to reset at
 * midnight, and nothing that can drift out of sync with what is actually in
 * /notities.
 */

export const NOTE_XP_MIN_LENGTH = 15;
export const NOTE_XP_DAILY_CAP = 3;

// isPro must come from resolveIsPro (Stripe, store and admin), never `subscribed` alone.
// The number itself lives in lib/entitlements.ts, beside the other free limits.
export { FREE_NOTE_LIMIT };

export function canCreateAnotherNote(existingNoteCount: number, isPro: boolean): boolean {
  return isPro || existingNoteCount < FREE_NOTE_LIMIT;
}

/**
 * The notes that count towards FREE_NOTE_LIMIT: every note the reader wrote,
 * on the website or in the app. Deliberately NOT counted:
 *  - pure highlights (type "highlight"): markeringen stay free and unlimited;
 *  - the note a finished lesson writes from the Toepassing answer
 *    (lib/studyCompletion.ts, tag "studie") - finishing a handful of lessons
 *    would otherwise use up the whole allowance.
 * `type: { $ne }` rather than `$in` so an old note without a type still counts
 * as the note it is.
 *
 * App notes used to be excluded (by `clientId`) because the app had no limit.
 * That also excluded every note written on the website since app/api/notes
 * started stamping a `web-<uuid>` clientId, so the website limit had quietly
 * stopped counting new notes. One limit for both clients, counted the same way.
 */
export function limitedNotesFilter(userId: unknown): Record<string, unknown> {
  return {
    userId,
    type: { $ne: 'highlight' },
    tags: { $ne: 'studie' },
  };
}

/** Shown when a free account reaches the limit, on the website and in the app. */
export const NOTE_LIMIT_MESSAGE =
  `Je hebt je ${FREE_NOTE_LIMIT} gratis notities gebruikt. Met Pro schrijf je onbeperkt notities. ` +
  'Markeringen en je antwoorden uit de studies tellen niet mee.';

/**
 * For the v1 sync paths, which only learn whether a write creates a note once
 * they have looked the record up: answers "may this account add one more?"
 * lazily, so an edit of an existing note never pays for the count.
 */
export function noteCreationGuard(userId: unknown, isPro: boolean): () => Promise<boolean> {
  return async () => {
    if (isPro) return true;
    const count = await Note.countDocuments(limitedNotesFilter(userId));
    return canCreateAnotherNote(count, isPro);
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function noteQualifiesForXp(noteText: unknown, type?: unknown): boolean {
  // A pure highlight carries no text of the user's own; §5.5 leaves highlights
  // out of v1 rather than paying 8 XP for tapping a verse.
  if (type === 'highlight') return false;
  return typeof noteText === 'string' && noteText.trim().length >= NOTE_XP_MIN_LENGTH;
}

/**
 * Grants note XP if this note earns it. Returns null when it does not - which
 * is the normal case for edits, highlights, stubs and the fourth note of the
 * day, so callers must treat null as success.
 */
export async function grantNoteXp(
  userId: string,
  options: { isPro: boolean; noteText: unknown; type?: unknown; created: boolean },
): Promise<GrantResult | null> {
  if (!options.created) return null;
  if (!noteQualifiesForXp(options.noteText, options.type)) return null;

  await connectMongoDB();

  // Counted after the note exists, so the note being paid for is included:
  // the cap is reached on the fourth note of the day, not the fifth.
  const today = await Note.countDocuments({
    userId,
    type: { $in: ['note', 'both'] },
    createdAt: { $gte: startOfDay(new Date()) },
  });
  if (today > NOTE_XP_DAILY_CAP) return null;

  return grantXp(userId, 'note_written', { isPro: options.isPro });
}
