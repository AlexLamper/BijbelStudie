import { createHmac } from 'crypto';

/**
 * Pure normalisation and hashing for contact matching. No database and no
 * request here, so it is unit-testable on its own (tests/friendsDiscovery.test.ts)
 * and can be reasoned about without reading the routes.
 *
 * The rule the whole feature rests on: an address book never leaves a phone in
 * the clear, and a hash someone uploads while matching is never stored. See
 * VRIENDENKRING_PLAN.md §6, including the honest note that phone-number hashes
 * are brute-forceable by nature - the server-held pepper, the rate limit and
 * not retaining uploads are what keep that expensive.
 */

/** Hex characters kept from the HMAC. 32 hex = 128 bits, plenty for matching. */
const HASH_LENGTH = 32;

/**
 * Dutch numbers are the common case, so the fallback country is NL. A number
 * already in international form is left alone.
 *
 * `06 12 34 56 78`, `+31 6 12345678`, `0031612345678` and `06-12345678` all
 * have to come out as one string, or two people who have each other in their
 * contacts will not match.
 */
export function normalisePhone(raw: string, country = 'NL'): string | null {
  if (!raw) return null;
  let value = String(raw).trim();
  // Strip everything a human or an address book might add.
  value = value.replace(/[\s\-(). ‑-―]/g, '');
  if (!value) return null;

  // 00 31 ... is the same as +31 ...
  if (value.startsWith('00')) value = `+${value.slice(2)}`;

  if (value.startsWith('+')) {
    const digits = value.slice(1).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : null;
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  const prefix = COUNTRY_PREFIX[country] ?? COUNTRY_PREFIX.NL;
  // A national number written with its trunk zero: 0612345678 -> +31612345678.
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  if (national.length < 8) return null;
  return `+${prefix}${national}`;
}

/** Only the countries the app actually ships in; NL is the fallback. */
const COUNTRY_PREFIX: Record<string, string> = {
  NL: '31',
  BE: '32',
  DE: '49',
  GB: '44',
  US: '1',
  ZA: '27',
};

export function normaliseEmail(raw: string): string | null {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  // Deliberately not a full address validator: a thing with an @ and a dot
  // after it is enough to hash, and anything stricter would silently drop
  // addresses that work.
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}

/**
 * HMAC-SHA256 under the server's pepper. The pepper never ships in a client
 * binary - the app fetches it from `/friends/discovery/pepper` - so it can be
 * rotated, which invalidates every stored hash on purpose.
 */
export function hashIdentifier(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex').slice(0, HASH_LENGTH);
}

export function hashPhone(raw: string, pepper: string, country = 'NL'): string | null {
  const normalised = normalisePhone(raw, country);
  return normalised ? hashIdentifier(normalised, pepper) : null;
}

export function hashEmail(raw: string, pepper: string): string | null {
  const normalised = normaliseEmail(raw);
  return normalised ? hashIdentifier(normalised, pepper) : null;
}

/** Dedupe, drop anything malformed, and cap - the match route trusts no input. */
export function sanitiseHashes(raw: unknown, max = 2000): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const value = item.trim().toLowerCase();
    if (value.length === HASH_LENGTH && /^[0-9a-f]+$/.test(value)) out.add(value);
    if (out.size >= max) break;
  }
  return [...out];
}

/**
 * The pepper, from the environment. Absent in a dev shell that never set it,
 * which must not crash a route: without it contact matching is simply off, and
 * the caller answers 503 rather than hashing under a guessable constant.
 */
export function contactPepper(): string | null {
  const value = process.env.FRIENDS_CONTACT_PEPPER;
  return typeof value === 'string' && value.length >= 16 ? value : null;
}
