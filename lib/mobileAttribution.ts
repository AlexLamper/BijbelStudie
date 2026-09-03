import { BIBLE_ATTRIBUTIONS } from './bible-attribution';
import { STEPBIBLE_ATTRIBUTION } from './mobileLicensing';

/**
 * Attribution shown in the mobile app under every chapter.
 *
 * Kept separate from `lib/bible-attribution.ts` on purpose: that file drives
 * the website and currently renders nothing for public-domain translations.
 * Adding entries there would change what the website shows. The App Store
 * review team does look for provenance on scripture apps (guideline 5.2), so
 * mobile states it for every source, public domain included.
 */
const MOBILE_BIBLE_ATTRIBUTION: Record<string, string> = {
  statenvertaling: 'Statenvertaling (1637) - publiek domein',
  // Contractually fixed by the Nederlands-Vlaams Bijbelgenootschap and shared
  // with the website so the two can never drift: reproduce EXACTLY, no dash
  // normalisation, no added year, no reworded licence note.
  nbg51: BIBLE_ATTRIBUTIONS.nbg51,
  heilige_schrift_1917: 'De Heilige Schrift 1917 - publiek domein',
  canisiusbijbel:
    'Canisiusbijbel 1939 - publiek domein (bron: ebible.org, nld1939)',
  kjv: 'King James Version (1611) - publiek domein',
  asv: 'American Standard Version (1901) - publiek domein',
  web: 'World English Bible - publiek domein',
  geneva: 'Geneva Bible (1599) - publiek domein',
  coverdale: 'Coverdale Bible (1535) - publiek domein',
};

const MOBILE_COMMENTARY_ATTRIBUTION: Record<string, string> = {
  matthew_henry_nl: 'Matthew Henry (1662–1714) - publiek domein',
  dachsel: 'Karl August Dachsel (1818–1893) - publiek domein',
  meyer: 'Heinrich August Wilhelm Meyer (1800–1873) - publiek domein',
  // The only commentary in the app that is not public domain, so this line is
  // the copyright notice rather than a provenance note. Reproduce as written.
  kingcomments_nl:
    'KingComments - Ger de Koning © Stichting Titus / Uitgeverij Daniel - '
    + 'met toestemming gebruikt',
};

export function mobileBibleAttribution(versionId: string): string {
  return MOBILE_BIBLE_ATTRIBUTION[versionId] ?? 'Publiek domein';
}

export function mobileCommentaryAttribution(commentaryId: string): string {
  return MOBILE_COMMENTARY_ATTRIBUTION[commentaryId] ?? 'Publiek domein';
}

export function mobileOriginalAttribution(): string {
  return STEPBIBLE_ATTRIBUTION;
}
