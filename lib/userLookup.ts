import User from '../models/User';

/**
 * Every write path funnels the address through this before it touches Mongo,
 * so `Bob@X.com` and `bob@x.com` land on the same account instead of two.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// A user-supplied string must never reach `new RegExp` unescaped: besides the
// ReDoS risk, characters like `.` and `+` would silently turn the "exact
// match" fallback below into a pattern match.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive user lookup. Tries the normalised value first (hits the
 * unique index on `email`), then falls back to an anchored, case-insensitive
 * exact match for rows written before emails were normalised on write -
 * without that fallback, an existing user's own mixed-case address would
 * permanently lock them out.
 */
export async function findUserByEmail(email: string) {
  const normalised = normaliseEmail(email);
  const exact = await User.findOne({ email: normalised });
  if (exact) return exact;
  return User.findOne({ email: new RegExp(`^${escapeRegExp(normalised)}$`, 'i') });
}
