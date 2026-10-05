/**
 * The Dutch of the profile page and the suggestions section, in one place.
 *
 * Same reason components/settings/vriendenkringCopy.ts exists: these lines are
 * the product's promise about who sees what, they are asserted in
 * tests/vriendenkringWeb.test.ts, and a wording change should be one edit in
 * one file rather than a hunt through JSX.
 *
 * House rules: Dutch, no em or en dashes (use '-'), and nothing that tells a
 * reader why a profile is missing - the endpoint deliberately conflates "they
 * blocked you", "they are gone" and "that is you".
 */

/** `GET /api/v1/friends/suggestions`, as a section on /vriendenkring. */
export const SUGGESTIONS_COPY = {
  title: 'Mensen die je misschien kent',
  hint: 'Vrienden van de mensen in je kring.',
  invite: 'Uitnodigen',
  inviting: 'Versturen...',
  sent: 'Verzoek verstuurd',
} as const;

/** `/vriendenkring/<id>` - one person's profile. */
export const PROFILE_COPY = {
  /** The meta line when there is no plan day to show. Same as a kring row. */
  readsAlong: 'Leest mee',
  befriend: 'Vrienden worden',
  befriending: 'Versturen...',
  requestSent: 'Verzoek verstuurd. Zodra het geaccepteerd is, zien jullie elkaars voortgang.',
  remove: 'Uit je kring halen',
  block: 'Blokkeren',
  removeBody: 'Jullie zien elkaars berichten niet meer. Je kunt elkaar later opnieuw uitnodigen.',
  removeAction: 'Verwijderen',
  removePending: 'Verwijderen...',
  blockPending: 'Blokkeren...',
  mutualsHint: 'Vrienden die jullie delen.',
  /** Any failure that is not a 404. The feature degrades quietly everywhere. */
  unavailable: 'Dit profiel kan nu niet geladen worden.',
} as const;

const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/** "12 vrienden". A count is public; the list is not. */
export function friendCountLabel(count: number): string {
  return count === 1 ? '1 vriend' : `${count} vrienden`;
}

/** "Vrienden sinds maart 2026", or null when the date is missing or unusable. */
export function friendsSinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return `Vrienden sinds ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
}

/**
 * The tail under a capped mutuals list. `MUTUALS_SHOWN` in the service names
 * twelve; `mutualCount` carries the real total, so the rest get a line.
 */
export function moreMutualsLabel(hidden: number): string | null {
  if (hidden < 1) return null;
  return hidden === 1 ? 'En nog 1 ander.' : `En nog ${hidden} anderen.`;
}

/** The heading over their own kring, which only a friend is shown. */
export function theirKringTitle(name: string): string {
  return `Vrienden van ${name}`;
}

/**
 * Their kring is empty, which is only ever said when the caller IS a friend
 * and so may see the list. `friends: null` says "not yours to see" and gets no
 * line at all, because this one would read as if it were an answer.
 */
export function noOtherFriendsLabel(name: string): string {
  return `Buiten jou heeft ${name} nog geen vrienden.`;
}

/** The way on to `/gebruiker/<id>`, shown only when that page exists. */
export function publicTreeLabel(name: string): string {
  return `Bekijk de boom van ${name}`;
}

/** The confirm title, the same sentence a kring row asks. */
export function removeConfirmTitle(name: string): string {
  return `${name} uit je kring halen?`;
}
