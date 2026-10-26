import User from '../models/User';
import type { Platform } from './mobileTokens';

/**
 * Which clients an account uses - the iOS app, the Android app, the website -
 * for the admin's per-account and per-platform figures. Two fields on User:
 * `signupPlatform` (set once, at creation) and `platformsSeenAt.<platform>`
 * (a last-seen date per client, kept here).
 *
 * Only the platform name is stored. No user agent, device model or IP: that
 * is all the admin page needs and keeps this out of fingerprinting territory.
 */

export type SeenPlatform = 'ios' | 'android' | 'web';

export const SEEN_PLATFORMS: readonly SeenPlatform[] = ['ios', 'android', 'web'];

/** A last-seen date this fresh is not rewritten. */
const SEEN_THROTTLE_MS = 60 * 60 * 1000;

// Per-instance memory in front of the database filter below. The website's
// session callback runs on every page render; without this each one would be
// an update round trip, even though the filter makes almost all of them no-ops.
const recentlyWritten = new Map<string, number>();
const MAX_REMEMBERED = 5000;

export function isSeenPlatform(value: unknown): value is SeenPlatform {
  return value === 'ios' || value === 'android' || value === 'web';
}

/**
 * Marks [userId] as having used [platform] just now. Never throws: this is
 * bookkeeping on the side of a login or a page render, and must not fail one.
 */
export async function recordPlatformSeen(
  userId: unknown,
  platform: Platform | SeenPlatform | null | undefined,
): Promise<void> {
  if (!userId || !isSeenPlatform(platform)) return;
  const key = `${String(userId)}:${platform}`;
  const now = Date.now();
  const last = recentlyWritten.get(key);
  if (last !== undefined && now - last < SEEN_THROTTLE_MS) return;

  if (recentlyWritten.size >= MAX_REMEMBERED) recentlyWritten.clear();
  recentlyWritten.set(key, now);

  const field = `platformsSeenAt.${platform}`;
  try {
    await User.updateOne(
      {
        _id: userId,
        $or: [{ [field]: { $exists: false } }, { [field]: { $lt: new Date(now - SEEN_THROTTLE_MS) } }],
      },
      { $set: { [field]: new Date(now) } },
    );
  } catch (error) {
    recentlyWritten.delete(key);
    console.error('recordPlatformSeen failed', error);
  }
}
