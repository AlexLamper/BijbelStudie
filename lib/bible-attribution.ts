// Copyright/attribution notices that must be shown wherever a translation's
// text is displayed. Public-domain translations have no entry and render nothing.
//
// The NBG-vertaling 1951 string is contractually required by the
// Nederlands-Vlaams Bijbelgenootschap and must be reproduced EXACTLY as below.
//
// The HSV line: the licence with Jongbloed (DBL HSV, Nov 2026, art. 5.3)
// requires the exact text "Tekst © 2010/2016 Stichting HSV" in every
// installation, and art. 5.2 requires the translation's name or abbreviation
// to be visible wherever its text is shown - hence the "HSV - " prefix, which
// also travels with every copied verse. Do not reword the part after it.
export const BIBLE_ATTRIBUTIONS: Record<string, string> = {
  nbg51: 'NBG-vertaling 1951© 1951 Nederlands-Vlaams Bijbelgenootschap',
  hsv: 'HSV - Tekst © 2010/2016 Stichting HSV',
};

export function getBibleAttribution(version?: string | null): string | null {
  if (!version) return null;
  return BIBLE_ATTRIBUTIONS[version.toLowerCase()] ?? null;
}
