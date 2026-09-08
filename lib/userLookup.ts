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
/** Just the slice of the User model these helpers touch, so callers can inject a
 * double in tests without pulling mongoose into the test process. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type UserModelLike = {
  findOne(filter: Record<string, unknown>): Promise<any>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<any>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function findUserByEmail(email: string, model: UserModelLike = User) {
  const normalised = normaliseEmail(email);
  const exact = await model.findOne({ email: normalised });
  if (exact) return exact;
  return model.findOne({ email: new RegExp(`^${escapeRegExp(normalised)}$`, 'i') });
}
