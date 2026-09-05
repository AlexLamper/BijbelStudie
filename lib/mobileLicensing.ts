/**
 * Single source of truth for what content may be served to the mobile apps.
 *
 * This is a LICENSING gate, not a UX filter. Every `/api/v1/*` content route
 * must call `assertMobileAllowed()` before it touches `lib/local-data.ts`, so
 * a hand-crafted request cannot reach blocked text.
 *
 * Blocked, and why (see IOS_APP_BRIEF.md §1.5 for the full dossier):
 *
 *   luther_1912      Public domain, but the app ships Dutch and English only.
 *   elberfelder_1905 Public domain, same reason. Both stay on the website.
 *   net              NET Bible, (c) Biblical Studies Press. Whole-text
 *                    electronic distribution needs written permission and
 *                    "cannot be bundled with anything sold". We sell Pro.
 *   hsv              Copyrighted (Stichting HSV). Not in manifest.json. Keep out.
 *   basisbijbel      Copyrighted. Not in manifest.json. Keep out.
 *   schlachter       Schlachter 2000, (c) Genfer Bibelgesellschaft. In
 *                    manifest.json for the website but not public domain.
 *   afri             Afrikaans module of unverified provenance. Not cleared.
 *
 * Adding a source back is a one-line change to the relevant Set, and should
 * only happen once written permission is on file.
 */

/**
 * Bible version ids exactly as they appear in `public/data/manifest.json`
 * (with `.json` stripped). Do not invent shorthand - the id in this Set is
 * the id the client sends and the id `lib/local-data.ts` resolves.
 */
export const MOBILE_ALLOWED_BIBLES: ReadonlySet<string> = new Set([
  'statenvertaling', // Public domain
  // NBG-vertaling 1951. Licensed, not public domain: the mobile app is covered
  // by the licence held for this product. The text itself is served from
  // /private (never a static asset) and only ever per chapter, exactly as on
  // the website - see `fetchJson` in lib/local-data.ts.
  'nbg51',
  'heilige_schrift_1917', // Public domain
  'canisiusbijbel', // ebible.org cleared with KBS; treated as public domain
  'kjv', // Public domain
  'asv', // Public domain
  'web', // Public domain
  'geneva', // Public domain (1599)
  'coverdale', // Public domain (1535)
]);

/**
 * Commentary ids as they appear in `public/data/manifest.json`.
 *
 * `meyer` is public domain (Heinrich Meyer, d. 1898) and `public/data/
 * commentaries/meyer.json` exists on disk, but it is NOT registered in
 * manifest.json, so it will not surface in /api/v1/commentaries until it is.
 * It is allowlisted here so that registering it is the only step needed.
 */
export const MOBILE_ALLOWED_COMMENTARIES: ReadonlySet<string> = new Set([
  'matthew_henry_nl', // Matthew Henry, d. 1714 - public domain
  'dachsel', // Karl August Dachsel, d. 1893 - public domain
  'meyer', // Heinrich Meyer, d. 1898 - public domain
  // John Calvin, d. 1564 — Dutch text pending permission from Stichting de
  // Gihonbron; placeholder-only until granted
  'calvijn_nl',
  // KingComments (Ger de Koning), (c) Stichting Titus / Uitgeverij Daniel.
  // NOT public domain: it is here on the licence the product holds, the same
  // one that makes it free of charge for every reader on the website. That
  // second half is not optional - see `isAlwaysFreeCommentary` in
  // lib/proContent.ts, which keeps it outside the Pro gate in every variant.
  // Never put this id behind the paywall and never re-cut the text.
  'kingcomments_nl',
]);

/**
 * Original-language sources. STEPBible TAHOT/TAGNT is CC BY 4.0 and REQUIRES
 * visible attribution wherever it is rendered - see `STEPBIBLE_ATTRIBUTION`.
 */
export const MOBILE_ALLOWED_ORIGINALS: ReadonlySet<string> = new Set([
  'stepbible',
]);

export const STEPBIBLE_ATTRIBUTION =
  'Grondtekst: STEPBible (TAHOT/TAGNT), CC BY 4.0 - tyndale.org';

export type MobileContentKind = 'bible' | 'commentary' | 'original';

export class MobileLicensingError extends Error {
  /** 451 Unavailable For Legal Reasons. */
  readonly status = 451;
  readonly code = 'CONTENT_NOT_LICENSED_FOR_MOBILE';
  readonly kind: MobileContentKind;
  readonly id: string;

  constructor(kind: MobileContentKind, id: string) {
    super('CONTENT_NOT_LICENSED_FOR_MOBILE');
    this.name = 'MobileLicensingError';
    this.kind = kind;
    this.id = id;
  }
}

function setFor(kind: MobileContentKind): ReadonlySet<string> {
  if (kind === 'bible') return MOBILE_ALLOWED_BIBLES;
  if (kind === 'commentary') return MOBILE_ALLOWED_COMMENTARIES;
  return MOBILE_ALLOWED_ORIGINALS;
}

export function isMobileAllowed(kind: MobileContentKind, id: string | null | undefined): boolean {
  if (!id) return false;
  // Exact match only. No normalisation, no case folding, no alias table:
  // every fuzzy match is a way for blocked content to slip through.
  return setFor(kind).has(id);
}

/**
 * Throws a 451 for anything not explicitly allowlisted. Call this FIRST in
 * every mobile content handler, before any filesystem or manifest access.
 */
export function assertMobileAllowed(kind: MobileContentKind, id: string | null | undefined): string {
  if (!id || !isMobileAllowed(kind, id)) {
    throw new MobileLicensingError(kind, id ?? '');
  }
  return id;
}

/** Filters a manifest-shaped list down to what mobile may see. */
export function filterAllowedForMobile<T extends { id: string }>(
  kind: MobileContentKind,
  items: T[],
): T[] {
  return items.filter((item) => isMobileAllowed(kind, item.id));
}
