/**
 * "Tekst van de dag" in the reader's own translation.
 *
 * The feed behind the card (BijbelAPI.com) only speaks the Statenvertaling, so
 * the day's REFERENCE always comes from there. When the reader has picked a
 * different translation, the server looks the same verse up in that
 * translation's own data and swaps the text; when the verse is not there (a
 * translation with a different versification, a missing book) the card keeps
 * the Statenvertaling, labelled as such.
 *
 * Pure on purpose - no Next.js, no filesystem, no database - so the routes
 * (`/api/bible/daytext`, `/api/v1/daytext`), the dashboard hook and the tests
 * all share one set of rules.
 */

import { MOBILE_ALLOWED_BIBLES } from './mobileLicensing';
import { getBibleAttribution } from './bible-attribution';

export const DAYTEXT_DEFAULT_VERSION = 'statenvertaling';

/**
 * Display names, as the reader's translation picker prints them
 * (`VERSIONS` in hooks/useBibleData.ts).
 */
const VERSION_NAMES: Record<string, string> = {
  statenvertaling: 'Statenvertaling',
  nbg51: 'NBG-vertaling 1951',
  heilige_schrift_1917: 'De Heilige Schrift 1917',
  canisiusbijbel: 'Canisiusbijbel 1939',
  kjv: 'King James Version',
  asv: 'American Standard Version',
  web: 'World English Bible',
  geneva: 'Geneva Bible (1599)',
  coverdale: 'Coverdale Bible (1535)',
};

export type DayTextBase = {
  text: string;
  reference: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
};

export type DayTextInVersion = DayTextBase & {
  /** The translation id the text is actually in, e.g. `nbg51`. */
  versionId: string;
  /**
   * The copyright notice that must travel with this text, verbatim, or null
   * for a public-domain translation. The NBG51 string is contractual.
   */
  attribution: string | null;
};

/**
 * The translation a daily verse may be served in.
 *
 * Only the translations licensed for every surface (`MOBILE_ALLOWED_BIBLES`)
 * qualify - the same allowlist the app's reader is held to, and a subset of the
 * website's reader. Anything else - NET Bible, Schlachter, a typo, a hand-made
 * query string - falls back to the Statenvertaling rather than erroring: the
 * card must always render. Exact match only, as in `isMobileAllowed`.
 */
export function resolveDayTextVersion(requested: unknown): string {
  if (typeof requested !== 'string' || !requested) return DAYTEXT_DEFAULT_VERSION;
  return MOBILE_ALLOWED_BIBLES.has(requested) ? requested : DAYTEXT_DEFAULT_VERSION;
}

export function dayTextVersionName(versionId: string): string {
  return VERSION_NAMES[versionId] ?? versionId;
}

/**
 * One verse's text out of a chapter's `verses` map (what `getChapter` returns).
 * Tags are dropped and whitespace collapsed; an empty verse counts as missing.
 */
export function verseFromChapter(verses: unknown, verse: number): string | null {
  if (!verses || typeof verses !== 'object' || !Number.isInteger(verse) || verse < 1) {
    return null;
  }
  const raw = (verses as Record<string, unknown>)[String(verse)];
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * The card's payload in `versionId`, or - when `text` is null - the
 * Statenvertaling original, labelled as the Statenvertaling. The reference,
 * book, chapter and verse never change: it is the same verse on the same day.
 */
export function withDayTextVersion(
  base: DayTextBase,
  versionId: string,
  text: string | null,
): DayTextInVersion {
  if (versionId === DAYTEXT_DEFAULT_VERSION || !text) {
    return {
      ...base,
      versionId: DAYTEXT_DEFAULT_VERSION,
      attribution: getBibleAttribution(DAYTEXT_DEFAULT_VERSION),
    };
  }
  return {
    ...base,
    text,
    version: dayTextVersionName(versionId),
    versionId,
    attribution: getBibleAttribution(versionId),
  };
}

/**
 * Which translation the website's dashboard should ask for.
 *
 * Follows the reader's own restore order (hooks/useBibleData.ts): the
 * translation of the last chapter read, else the account preference. On top of
 * that, the translation this browser last switched to in the reader wins when
 * it is newer than the server's last-read stamp - the reader writes last-read
 * on a 1.5 s debounce, so someone who switches and goes straight back to the
 * dashboard would otherwise still see the old translation.
 */
export function pickDashboardVersion(input: {
  local?: { id?: unknown; at?: unknown } | null;
  lastRead?: { version?: unknown; updatedAt?: unknown } | null;
  preferred?: unknown;
}): string {
  const serverId =
    typeof input.lastRead?.version === 'string' && input.lastRead.version
      ? input.lastRead.version
      : typeof input.preferred === 'string' && input.preferred
        ? // The reader lower-cases the stored preference before matching it.
          input.preferred.trim().toLowerCase()
        : null;

  const localId = typeof input.local?.id === 'string' && input.local.id ? input.local.id : null;
  if (localId) {
    const localAt = typeof input.local?.at === 'number' ? input.local.at : 0;
    const serverAt =
      typeof input.lastRead?.updatedAt === 'string' || input.lastRead?.updatedAt instanceof Date
        ? new Date(input.lastRead.updatedAt as string | Date).getTime()
        : NaN;
    // No dated server copy to compare against: this device's choice stands.
    if (!serverId || !Number.isFinite(serverAt) || localAt >= serverAt) {
      return resolveDayTextVersion(localId);
    }
  }
  return resolveDayTextVersion(serverId);
}
