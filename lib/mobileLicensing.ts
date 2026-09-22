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
 */
export const MOBILE_ALLOWED_COMMENTARIES: ReadonlySet<string> = new Set([
  'matthew_henry_nl', // Matthew Henry, d. 1714 - public domain
  'dachsel', // Karl August Dachsel, d. 1893 - public domain
  // John Calvin, d. 1564. Dutch text is translated from the public-domain
  // English Calvin Translation Society edition (public domain, John King et
  // al., 1840s-50s) - our own translation of a public-domain work, no
  // third-party rights. Rolled out per book in canonical order; chapters
  // not yet translated carry the placeholder string.
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

/**
 * Cross-reference datasets. OpenBible.info's cross-reference file is CC BY:
 * visible credit, a pointer at the source, and - because the build script
 * filters the pairs and renumbers both ends onto each versification profile -
 * an explicit statement that the data was changed.
 *
 * References are verse *coordinates*, not text, so no translation is
 * redistributed by this source. The preview text a client renders next to a
 * reference always comes from the chapter endpoints and keeps that
 * translation's own attribution.
 */
export const MOBILE_ALLOWED_CROSSREFS: ReadonlySet<string> = new Set([
  'openbible', // OpenBible.info cross references, CC BY
]);

/**
 * The full CC BY notice. Rendered wherever there is room for it: the website
 * panel and materials tab, the licences page, the app's Over screen. The
 * "bewerkt" clause is the licence's "indicate changes" obligation, so it is
 * not trimmable copy.
 */
export const OPENBIBLE_CROSSREF_ATTRIBUTION =
  'Kruisverwijzingen: OpenBible.info (CC BY), bewerkt: gefilterd en omgezet naar '
  + 'de versnummering van deze vertaling. Versnummering via STEPBible TVTMS (CC BY 4.0).';

/** Short form for places where the long notice does not fit (app sheet footer). */
export const OPENBIBLE_CROSSREF_ATTRIBUTION_SHORT =
  'Kruisverwijzingen: OpenBible.info, CC BY (bewerkt)';

export type MobileContentKind = 'bible' | 'commentary' | 'original' | 'crossref';

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
  if (kind === 'crossref') return MOBILE_ALLOWED_CROSSREFS;
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
