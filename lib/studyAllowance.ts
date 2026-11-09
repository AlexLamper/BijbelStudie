import type { Limits } from './entitlements';
import { allowanceKey, claimAllowance, recordTrialUsage } from './reverseTrial';
import type { ReverseTrialFields } from './reverseTrialRules';

/**
 * Who may read a chapter of PAID study material (a Matthew Henry / Calvijn /
 * Dachsel commentary, the grondtekst), decided once for the routes that serve
 * it - /api/commentary on the website, /api/v1/commentaries and
 * /api/v1/original for the app:
 *
 *  - `pro`: everything. During the reverse trial this is also where the use is
 *    counted (one of the four features it weighs).
 *  - `preview`: the normal free preview (lib/proContent.ts `gateCommentary`,
 *    `gateOriginal`), as often as the reader likes.
 *  - `allowance`: study material is this account's personal limit. Today's one
 *    chapter (TINY_STUDY_CHAPTERS_PER_DAY) opens in full - commentaries and
 *    grondtekst together, keyed by book and chapter - and every other chapter
 *    gets the lock without a preview.
 */
export type StudyAccess =
  | { mode: 'pro' }
  | { mode: 'preview' }
  | { mode: 'allowance'; allowed: boolean; used: number; cap: number };

export interface StudyReader {
  id: string;
  isPro: boolean;
  limits?: Limits | null;
  /** The stored trial when the caller holds it; omit to let the counter's own filter decide. */
  reverseTrial?: ReverseTrialFields | null;
  /** For a caller without the stored trial (the website session): is the trial running? */
  trialActive?: boolean;
}

export async function studyAccess(
  reader: StudyReader | null | undefined,
  book: string,
  chapter: number,
): Promise<StudyAccess> {
  if (!reader?.id) return { mode: 'preview' };
  if (reader.isPro) {
    if (reader.reverseTrial !== undefined) {
      void recordTrialUsage(reader.id, 'study', reader.reverseTrial);
    } else if (reader.trialActive) {
      void recordTrialUsage(reader.id, 'study');
    }
    return { mode: 'pro' };
  }
  const cap = reader.limits?.studyChaptersPerDay ?? null;
  if (cap === null) return { mode: 'preview' };
  const claim = await claimAllowance(reader.id, 'study', allowanceKey(book, chapter), cap);
  return { mode: 'allowance', ...claim };
}

/** The additive `personalLimit` field the routes put beside `locked`. */
export function personalLimitField(access: StudyAccess) {
  return access.mode === 'allowance'
    ? { personalLimit: { feature: 'study' as const, allowed: access.allowed, used: access.used, cap: access.cap } }
    : {};
}
