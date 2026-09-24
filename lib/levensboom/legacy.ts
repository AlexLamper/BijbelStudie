import User from '../../models/User';
import { floorForLegacyXp, type GrowthFloor } from './growth';

/**
 * The never-shrink floor's one stored number (LEVENSBOOM_GROWTH_PLAN.md §5).
 *
 * Growth v2 draws a smaller tree per level than v1 did, so every account that
 * existed at launch keeps a head start: its XP at the moment it is first read
 * after launch, stored once as `levensboom.legacyXp`. The floor itself is
 * derived (`floorForLegacyXp`), so a later change to the design table never
 * needs a migration.
 *
 * Preview deployments share the production database (CLAUDE.md, "Data
 * safety"). A capture from a branch preview before launch would pin a real
 * account to a smaller head start than it is owed, so writing is gated on
 * `VERCEL_ENV === 'production'` and on `TREE_GROWTH_LAUNCH_AT`. Where nothing
 * is stored the floor falls back to the current XP and nothing is written:
 * a missing env var costs the taper, never a tree.
 */

/** `process.env`, or a stand-in for it. Only these two keys are read. */
export type LegacyEnv = {
  VERCEL_ENV?: string;
  TREE_GROWTH_LAUNCH_AT?: string;
  [key: string]: string | undefined;
};

export type LegacyOptions = {
  env?: LegacyEnv;
  now?: Date;
};

/** The User fields this module reads. Select `xp createdAt levensboom`. */
export type LegacySource = {
  _id: unknown;
  xp?: number | null;
  createdAt?: Date | string | null;
  levensboom?: { legacyXp?: number | null; legacyAt?: Date | null } | null;
};

export type LegacyCapture = {
  filter: { _id: unknown; 'levensboom.legacyXp': { $exists: false } };
  update: { $set: { 'levensboom.legacyXp': number; 'levensboom.legacyAt': Date } };
};

function validDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** `TREE_GROWTH_LAUNCH_AT` as a date, or null when unset or not an ISO date. */
export function launchAtFrom(env: LegacyEnv): Date | null {
  const raw = env.TREE_GROWTH_LAUNCH_AT?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
  return validDate(raw);
}

function storedLegacyXp(user: LegacySource): number | null {
  const value = user.levensboom?.legacyXp;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The capture write for this account, or null when it is not due.
 *
 * Pure: builds the documents, touches nothing. The filter repeats the
 * "not captured yet" test, so two requests racing each other write once.
 * `xp` must be on the document - a user loaded without it would otherwise
 * capture 0 for good - so a document without it is not eligible.
 */
export function legacyCaptureUpdate(user: LegacySource, opts: { env: LegacyEnv; now: Date }): LegacyCapture | null {
  if (opts.env.VERCEL_ENV !== 'production') return null;
  const launchAt = launchAtFrom(opts.env);
  if (!launchAt) return null;
  const createdAt = validDate(user.createdAt);
  if (!createdAt || createdAt.getTime() >= launchAt.getTime()) return null;
  if (user.levensboom?.legacyXp !== undefined) return null;
  if (typeof user.xp !== 'number' || !Number.isFinite(user.xp)) return null;
  return {
    filter: { _id: user._id, 'levensboom.legacyXp': { $exists: false } },
    update: { $set: { 'levensboom.legacyXp': user.xp, 'levensboom.legacyAt': opts.now } },
  };
}

/**
 * Captures `legacyXp` when it is due, and returns the user with the captured
 * value in place so the payload built next already reads it. A targeted
 * `updateOne`, never a `save()`. A failed capture is logged and swallowed: the
 * request still answers, and `floorForUser`'s fallback keeps the tree whole.
 */
export async function ensureLegacyXp<T extends LegacySource>(user: T, opts: LegacyOptions = {}): Promise<T> {
  const now = opts.now ?? new Date();
  const capture = legacyCaptureUpdate(user, { env: opts.env ?? process.env, now });
  if (!capture) return user;
  try {
    // `timestamps: false`: the capture is bookkeeping, not an account change.
    // lib/adminInsights.ts buckets cancellations by `updatedAt`, and a launch
    // day that touched every account would read as a wave of churn.
    const result = await User.updateOne(capture.filter, capture.update, { timestamps: false });
    if (result?.modifiedCount === 1) {
      return {
        ...user,
        levensboom: {
          ...(user.levensboom ?? {}),
          legacyXp: capture.update.$set['levensboom.legacyXp'],
          legacyAt: now,
        },
      };
    }
  } catch (error) {
    console.error('[levensboom] legacyXp capture failed', error);
  }
  return user;
}

/**
 * The growth floor for this account. Read-only, so public cards can use it.
 *
 * - `legacyXp` stored: the floor it gives.
 * - Nothing stored and the account is known to be new (created at or after
 *   `TREE_GROWTH_LAUNCH_AT`): no floor.
 * - Nothing stored otherwise (env var missing, a preview, not read since
 *   launch): the floor for the current XP - the tree it had, at worst.
 */
export function floorForUser(user: LegacySource, opts: LegacyOptions = {}): GrowthFloor | null {
  const stored = storedLegacyXp(user);
  if (stored !== null) return floorForLegacyXp(stored);
  const launchAt = launchAtFrom(opts.env ?? process.env);
  const createdAt = validDate(user.createdAt);
  if (launchAt && createdAt && createdAt.getTime() >= launchAt.getTime()) return null;
  return floorForLegacyXp(user.xp ?? 0);
}
