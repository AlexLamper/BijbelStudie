// Copyright/attribution notices that must be shown wherever a translation's
// text is displayed. Public-domain translations have no entry and render nothing.
//
// The NBG-vertaling 1951 string is contractually required by the
// Nederlands-Vlaams Bijbelgenootschap and must be reproduced EXACTLY as below.
export const BIBLE_ATTRIBUTIONS: Record<string, string> = {
  nbg51: 'NBG-vertaling 1951© 1951 Nederlands-Vlaams Bijbelgenootschap',
};

export function getBibleAttribution(version?: string | null): string | null {
  if (!version) return null;
  return BIBLE_ATTRIBUTIONS[version.toLowerCase()] ?? null;
}
