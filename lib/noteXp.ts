import connectMongoDB from './mongodb';
import Note from '../models/Note';
import { grantXp, type GrantResult } from './gamification';

/**
 * XP for writing an aantekening.
 *
 * "Notes & reflection" is one of the four activities the Levensboom is fed by
 * (TREE_FEATURE_PLAN.md §5.5), and it was the only one with no XP event. It is
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
