// Copyright/attribution notices that must be shown wherever a translation's
// text is displayed. Public-domain translations have no entry and render nothing.
//
// The NBG-vertaling 1951 string is contractually required by the
// Nederlands-Vlaams Bijbelgenootschap and must be reproduced EXACTLY as below.
//
// The HSV line is the source line Stichting HSV requires "in alle gevallen"
// (herzienestatenvertaling.nl, "Gebruik HSV Teksten"). Reproduce it exactly:
// do not reword it, retype the year range or swap the ©.
export const BIBLE_ATTRIBUTIONS: Record<string, string> = {
  nbg51: 'NBG-vertaling 1951© 1951 Nederlands-Vlaams Bijbelgenootschap',
  hsv: 'Copyright ©2010/2016 Stichting HSV',
};

export function getBibleAttribution(version?: string | null): string | null {
  if (!version) return null;
  return BIBLE_ATTRIBUTIONS[version.toLowerCase()] ?? null;
}
