import { createHmac, timingSafeEqual } from 'crypto';
import { SITE_ORIGIN } from './channels/email';

/**
 * Engagement-mail preferences and the unsubscribe links that change them.
 *
 * Two switches on the User document (`emailPrefs`, models/User.js), both
 * opt-out (absent = on):
 *
 * - `winback`: the "we hebben je gemist" mails after 3, 7 and 14 days away
 *   (lib/winback.ts);
 * - `all`: every engagement mail. The footer's "Alle e-mails uitzetten".
 *
 * Transactional mail (password reset, feedback replies) is not governed by
 * either - it is mail the reader asked for.
 *
 * UNSUBSCRIBE TOKENS. A mail link must work without signing in, so it carries
 * the account id and an HMAC of `<userId>:<kind>`. The secret is
 * EMAIL_UNSUBSCRIBE_SECRET, or NEXTAUTH_SECRET when that is not set, so a
 * deployment without the new variable still produces working links. A token
 * only ever switches mail *off*; nothing a link can do turns mail on or reads
 * anything back.
 */

export type EmailKind = 'winback' | 'all';

export type EmailPrefs = { winback: boolean; all: boolean };

export function isEmailKind(value: unknown): value is EmailKind {
  return value === 'winback' || value === 'all';
}

/** The stored subdocument as the reader sees it: anything but an explicit false is on. */
export function effectiveEmailPrefs(stored: { winback?: unknown; all?: unknown } | null | undefined): EmailPrefs {
  return { winback: stored?.winback !== false, all: stored?.all !== false };
}

/** Whether a mail of [kind] may go to an account with these prefs. */
export function mayEmail(stored: { winback?: unknown; all?: unknown } | null | undefined, kind: Exclude<EmailKind, 'all'>): boolean {
  const prefs = effectiveEmailPrefs(stored);
  return prefs.all && prefs[kind];
}

function secret(): string | null {
  const value = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return value || null;
}

export function unsubscribeToken(userId: string, kind: EmailKind, key: string | null = secret()): string | null {
  if (!key) return null;
  return createHmac('sha256', key).update(`${userId}:${kind}`).digest('base64url').slice(0, 32);
}

export function verifyUnsubscribeToken(
  userId: unknown,
  kind: unknown,
  token: unknown,
  key: string | null = secret(),
): boolean {
  if (typeof userId !== 'string' || !/^[a-f0-9]{24}$/i.test(userId)) return false;
  if (!isEmailKind(kind) || typeof token !== 'string' || token.length !== 32) return false;
  const expected = unsubscribeToken(userId, kind, key);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The page a mail's footer links to (app/afmelden). Null without a secret. */
export function unsubscribePageUrl(userId: string, kind: EmailKind): string | null {
  const t = unsubscribeToken(userId, kind);
  if (!t) return null;
  const q = new URLSearchParams({ u: userId, k: kind, t });
  return `${SITE_ORIGIN}/afmelden?${q.toString()}`;
}

/** The RFC 8058 one-click target for the List-Unsubscribe header. */
export function unsubscribeOneClickUrl(userId: string, kind: EmailKind): string | null {
  const t = unsubscribeToken(userId, kind);
  if (!t) return null;
  const q = new URLSearchParams({ u: userId, k: kind, t });
  return `${SITE_ORIGIN}/api/email/unsubscribe?${q.toString()}`;
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

async function userModel() {
  const [{ default: connectMongoDB }, { default: User }] = await Promise.all([
    import('./mongodb'),
    import('../models/User'),
  ]);
  await connectMongoDB();
  return User;
}

export async function readEmailPrefs(userId: string): Promise<EmailPrefs> {
  const User = await userModel();
  const row = await User.findById(userId)
    .select('emailPrefs')
    .lean<{ emailPrefs?: { winback?: boolean; all?: boolean } } | null>();
  return effectiveEmailPrefs(row?.emailPrefs);
}

export async function writeEmailPrefs(userId: string, patch: Partial<EmailPrefs>): Promise<EmailPrefs> {
  const set: Record<string, unknown> = {};
  if (typeof patch.winback === 'boolean') {
    set['emailPrefs.winback'] = patch.winback;
    if (patch.winback) set['emailPrefs.all'] = true;
  }
  if (typeof patch.all === 'boolean') set['emailPrefs.all'] = patch.all;
  if (Object.keys(set).length > 0) {
    const User = await userModel();
    set['emailPrefs.updatedAt'] = new Date();
    await User.updateOne({ _id: userId }, { $set: set });
  }
  return readEmailPrefs(userId);
}

/** What an unsubscribe link does. Only ever switches off. */
export async function unsubscribe(userId: string, kind: EmailKind): Promise<void> {
  await writeEmailPrefs(userId, kind === 'all' ? { all: false } : { winback: false });
}
