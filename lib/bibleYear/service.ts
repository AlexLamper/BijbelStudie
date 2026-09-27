/**
 * "Bijbel in een jaar" persistence (DAILY_HABIT_PLAN.md §4). The only writer of
 * models/BibleYearEnrollment.js; the maths lives in ./progress and ./schedule.
 *
 * Data safety (CLAUDE.md): every write here is a targeted operator -
 *   enrollment  $addToSet / $pull readRefs, $addToSet paidDays ($each, one
 *               findOneAndUpdate returning the old array, so the days it
 *               newly added are exactly the days paid), $inc shiftDays, $set
 *               status / completedAt / lastActivityAt, and `create` for a new run.
 *   user        $addToSet `readChapters.<canonical Dutch book>` (manual tick
 *               only) and XP through lib/gamification.ts `grantXp` ($inc).
 * Nothing is replaced, saved hydrated, or deleted. XP is never taken back.
 */

import connectMongoDB from '../mongodb';
import BibleYearEnrollment from '../../models/BibleYearEnrollment';
import User from '../../models/User';
import { grantXp } from '../gamification';
import { isSafeBookKey } from '../readingProgress';
import { toCanonicalDutchBook } from '../readChaptersCanon';
import {
  DEFAULT_TIME_ZONE,
  buildBibleYearState,
  daysBetween,
  isBibleComplete,
  isDayRead,
  isValidDateString,
  isValidTimeZone,
  localDateIn,
  parseRefKey,
  readSetFrom,
  refKey,
  refKeysForDay,
  scheduleDaysOnDates,
  scheduledDayNumber,
  shiftForCatchUp,
  toRef,
  validateRefs,
  type BibleYearDayOnDate,
  type BibleYearProgressInput,
} from './progress';
import { SCHEDULE_VERSION, TOTAL_CHAPTERS, getSchedule, isPlanKey, isTrackKey } from './schedule';
import type {
  BibleYearMutationResponse,
  BibleYearPlanKey,
  BibleYearRef,
  BibleYearStateResponse,
  BibleYearStatus,
  BibleYearToday,
  BibleYearTrackKey,
} from './types';

/** Furthest start date accepted: a year and a day ahead (matches lib/bibleYear/display.ts). */
export const MAX_START_DAYS_AHEAD = 366;
/** Most chapters one mark request may carry (a whole day is at most a few dozen). */
export const MAX_MARK_REFS = 200;

/** A client error with a Dutch message; routes turn it into `{error, message}`. */
export class BibleYearError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'BibleYearError';
    this.status = status;
    this.code = code;
  }
}

const NO_PLAN = () => new BibleYearError(404, 'NOT_FOUND', 'Er is geen leesplan gevonden.');
const CONFLICT = () => new BibleYearError(409, 'ACTIVE_PLAN', 'Je hebt al een leesplan lopen.');
const invalid = (message: string) => new BibleYearError(400, 'INVALID_FIELDS', message);

type LeanEnrollment = {
  _id: { toString(): string };
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  scheduleVersion: number;
  startDate: string;
  timeZone?: string | null;
  shiftDays?: number | null;
  status: BibleYearStatus;
  readRefs?: string[] | null;
  paidDays?: number[] | null;
  completedAt?: Date | null;
};

const ENROLLMENT_FIELDS =
  '_id planKey track scheduleVersion startDate timeZone shiftDays status readRefs paidDays completedAt';

export function toProgressInput(doc: LeanEnrollment): BibleYearProgressInput {
  return {
    id: doc._id.toString(),
    planKey: doc.planKey,
    track: doc.track,
    scheduleVersion: doc.scheduleVersion,
    startDate: doc.startDate,
    timeZone: doc.timeZone || DEFAULT_TIME_ZONE,
    shiftDays: doc.shiftDays || 0,
    readRefs: doc.readRefs ?? [],
    status: doc.status,
    completedAt: doc.completedAt ?? null,
  };
}

function mutationResponse(doc: LeanEnrollment | null, now: Date): BibleYearMutationResponse {
  const state = buildBibleYearState(doc ? toProgressInput(doc) : null, now);
  return { enrollment: state.enrollment, today: state.today };
}

function findActive(userId: string) {
  return BibleYearEnrollment.findOne({ userId, status: 'active' })
    .select(ENROLLMENT_FIELDS)
    .lean<LeanEnrollment | null>();
}

// ---------------------------------------------------------------------------
// Input validation (pure)
// ---------------------------------------------------------------------------

export type ParsedStart = {
  planKey: BibleYearPlanKey;
  track: BibleYearTrackKey;
  startDate: string;
  timeZone: string;
};

/** Validates a start/restart body. The start date must be today or later in the chosen zone. */
export function parseStartBody(body: unknown, now: Date): ParsedStart {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (!isPlanKey(b.planKey)) throw invalid('Kies 1 jaar of 2 jaar.');
  if (!isTrackKey(b.track)) throw invalid('Kies een volgorde.');
  const timeZone = isValidTimeZone(b.timeZone) ? (b.timeZone as string) : DEFAULT_TIME_ZONE;
  if (!isValidDateString(b.startDate)) throw invalid('Kies een geldige datum.');
  const today = localDateIn(timeZone, now);
  if (b.startDate < today) throw invalid('Kies vandaag of een latere datum.');
  if (daysBetween(today, b.startDate) > MAX_START_DAYS_AHEAD) throw invalid('Kies een datum binnen een jaar.');
  return { planKey: b.planKey, track: b.track, startDate: b.startDate, timeZone };
}

/** Validates a mark body against the running plan. Returns canonical keys, de-duplicated. */
export function parseMarkBody(
  body: unknown,
  enrollment: Pick<BibleYearProgressInput, 'planKey' | 'track' | 'scheduleVersion'>,
): { keys: string[]; read: boolean } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (typeof b.read !== 'boolean') throw invalid('Geef aan of het gelezen is.');
  if ('refs' in b) {
    if (!Array.isArray(b.refs) || b.refs.length === 0) throw invalid('Kies minstens één hoofdstuk.');
    if (b.refs.length > MAX_MARK_REFS) throw invalid('Te veel hoofdstukken tegelijk.');
    const { keys, invalid: bad } = validateRefs(b.refs);
    if (bad.length > 0 || keys.length === 0) throw invalid('Onbekend bijbelboek of hoofdstuk.');
    return { keys, read: b.read };
  }
  if ('day' in b) {
    const day = typeof b.day === 'number' ? b.day : NaN;
    const keys = refKeysForDay(enrollment, day);
    if (!keys) throw invalid('Deze dag hoort niet bij je leesplan.');
    return { keys, read: b.read };
  }
  throw invalid('Kies een hoofdstuk of een dag.');
}

// ---------------------------------------------------------------------------
// XP and completion
// ---------------------------------------------------------------------------

type SettleDoc = Pick<
  LeanEnrollment,
  '_id' | 'planKey' | 'track' | 'scheduleVersion' | 'startDate' | 'timeZone' | 'shiftDays' | 'status' | 'readRefs' | 'paidDays'
>;

/** Reached (<= today's scheduled day), fully read days not yet paid. Pure. */
export function dueDays(doc: SettleDoc, now: Date): number[] {
  const today = scheduledDayNumber(
    { ...doc, timeZone: doc.timeZone || DEFAULT_TIME_ZONE, shiftDays: doc.shiftDays || 0 },
    now,
  );
  if (today < 1) return [];
  const schedule = getSchedule(doc.planKey, doc.track, doc.scheduleVersion);
  const paid = new Set(doc.paidDays ?? []);
  // Only validated keys are ever written, so a plain Set is enough here; the
  // completion check re-validates (see below).
  const read = new Set(doc.readRefs ?? []);
  const due: number[] = [];
  for (let d = 1; d <= today; d++) {
    if (!paid.has(d) && isDayRead(schedule.days[d - 1], read)) due.push(d);
  }
  return due;
}

/**
 * Pays `plan_day_read` for every reached, fully read, unpaid day, and
 * completes the plan when all 1189 chapters are in.
 *
 * Reached only: a day read ahead still ticks, but its XP waits until the
 * schedule reaches it (then the next mark, auto-tick or getState pays it) -
 * otherwise "mark everything, restart" would farm a whole plan's XP in two
 * requests. The scan is at most one Set lookup per reached day.
 *
 * Pay-once: one `$addToSet: {paidDays: {$each}}` that returns the array as
 * it was before; the days it newly added are the days paid, whatever other
 * requests did in between, and one grantXp pays them all at once.
 *
 * plan_completed XP is paid for the user's first completed run only (a
 * restarted plan can be finished again, but not for XP again). Returns
 * whether the plan was completed by this call.
 */
export async function settleProgress(
  userId: string,
  doc: SettleDoc,
  now: Date,
  isPro: boolean,
): Promise<{ paidDays: number[]; completed: boolean }> {
  const due = dueDays(doc, now);
  let paidDays: number[] = [];
  if (due.length > 0) {
    const before = await BibleYearEnrollment.findOneAndUpdate(
      { _id: doc._id },
      { $addToSet: { paidDays: { $each: due } } },
      { new: false, projection: { paidDays: 1 } },
    ).lean<{ paidDays?: number[] | null } | null>();
    if (before) {
      const old = new Set(before.paidDays ?? []);
      paidDays = due.filter((d) => !old.has(d));
    }
    if (paidDays.length > 0) {
      try {
        await grantXp(userId, 'plan_day_read', { isPro, multiplier: paidDays.length });
      } catch (error) {
        console.error('[bible-year] plan_day_read XP failed', error);
      }
    }
  }

  const read = doc.readRefs ?? [];
  let completed = false;
  if (doc.status === 'active' && read.length >= TOTAL_CHAPTERS && isBibleComplete(readSetFrom(read))) {
    const result = await BibleYearEnrollment.updateOne(
      { _id: doc._id, status: 'active' },
      { $set: { status: 'completed', completedAt: now, lastActivityAt: now } },
    );
    if (result.modifiedCount === 1) {
      completed = true;
      try {
        // Only one run can be active, so no other run completes concurrently.
        const earlier = await BibleYearEnrollment.countDocuments({
          userId,
          status: 'completed',
          _id: { $ne: doc._id },
        });
        // After the status write, so the badge count (lib/gamification.ts)
        // already includes this plan.
        if (earlier === 0) await grantXp(userId, 'plan_completed', { isPro });
      } catch (error) {
        console.error('[bible-year] plan_completed XP failed', error);
      }
    }
  }
  return { paidDays, completed };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * GET: the running plan, else the most recent completed one (for the
 * "Je hebt de hele Bijbel gelezen" screen), else null. One indexed read:
 * 'active' sorts before 'completed'.
 */
export async function getState(
  userId: string,
  now: Date = new Date(),
  options: { isPro?: boolean } = {},
): Promise<BibleYearStateResponse> {
  await connectMongoDB();
  let doc = await BibleYearEnrollment.findOne({ userId, status: { $in: ['active', 'completed'] } })
    .sort({ status: 1, completedAt: -1 })
    .select(ENROLLMENT_FIELDS)
    .lean<LeanEnrollment | null>();
  // Days read ahead are paid once reached (settleProgress). Pure scan first:
  // no write at all unless a reached, read day is still unpaid.
  if (doc && dueDays(doc, now).length > 0) {
    try {
      const { completed } = await settleProgress(userId, doc, now, Boolean(options.isPro));
      if (completed) doc = { ...doc, status: 'completed', completedAt: now };
    } catch (error) {
      console.error('[bible-year] settling due days failed', error);
    }
  }
  return buildBibleYearState(doc ? toProgressInput(doc) : null, now);
}

/** The dashboard's "Vandaag": null without a running plan. */
export async function getToday(userId: string, now: Date = new Date()): Promise<BibleYearToday | null> {
  return (await getState(userId, now)).today;
}

async function createRun(userId: string, start: ParsedStart, now: Date): Promise<LeanEnrollment> {
  // A new run can only be on day 1 today (the start date is today or later),
  // so "stop, start, tick day 1" is the only XP a fresh run offers. A run that
  // paid XP and was touched in the last 24 hours (e.g. just stopped) means
  // day 1 of this one counts as paid. Costs a real restarter 10 XP at most.
  const recentlyPaid = await BibleYearEnrollment.exists({
    userId,
    updatedAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    'paidDays.0': { $exists: true },
  });
  try {
    const created = await BibleYearEnrollment.create({
      userId,
      planKey: start.planKey,
      track: start.track,
      scheduleVersion: SCHEDULE_VERSION,
      startDate: start.startDate,
      timeZone: start.timeZone,
      shiftDays: 0,
      status: 'active',
      readRefs: [],
      paidDays: recentlyPaid ? [1] : [],
      completedAt: null,
      lastActivityAt: now,
    });
    return (typeof created.toObject === 'function' ? created.toObject() : created) as LeanEnrollment;
  } catch (error) {
    // The partial unique index: another request started a plan in between.
    if ((error as { code?: unknown })?.code === 11000) throw CONFLICT();
    throw error;
  }
}

/** POST: 409 when a plan is running. */
export async function start(userId: string, body: unknown, now: Date = new Date()): Promise<BibleYearMutationResponse> {
  const parsed = parseStartBody(body, now);
  await connectMongoDB();
  if (await BibleYearEnrollment.exists({ userId, status: 'active' })) throw CONFLICT();
  return mutationResponse(await createRun(userId, parsed, now), now);
}

/** PATCH: shift, stop or restart. */
export async function patch(userId: string, body: unknown, now: Date = new Date()): Promise<BibleYearMutationResponse> {
  const action = body && typeof body === 'object' ? (body as { action?: unknown }).action : undefined;
  if (action !== 'shift' && action !== 'stop' && action !== 'restart') {
    throw invalid('Onbekende actie.');
  }
  // Validate a restart before anything is abandoned.
  const restartWith = action === 'restart' ? parseStartBody(body, now) : null;
  await connectMongoDB();

  if (action === 'shift') {
    const active = await findActive(userId);
    if (!active) throw NO_PLAN();
    const { shiftBy } = shiftForCatchUp(toProgressInput(active), now);
    if (shiftBy <= 0) return mutationResponse(active, now);
    // Filtered on the shift we computed from, so a double tap cannot shift twice.
    const updated = await BibleYearEnrollment.findOneAndUpdate(
      { _id: active._id, status: 'active', shiftDays: active.shiftDays || 0 },
      { $inc: { shiftDays: shiftBy }, $set: { lastActivityAt: now } },
      { new: true },
    )
      .select(ENROLLMENT_FIELDS)
      .lean<LeanEnrollment | null>();
    return mutationResponse(updated ?? (await findActive(userId)), now);
  }

  if (action === 'stop') {
    const stopped = await BibleYearEnrollment.findOneAndUpdate(
      { userId, status: 'active' },
      { $set: { status: 'abandoned', lastActivityAt: now } },
      { new: true },
    )
      .select(ENROLLMENT_FIELDS)
      .lean<LeanEnrollment | null>();
    if (!stopped) throw NO_PLAN();
    return mutationResponse(stopped, now);
  }

  // restart: abandon the running plan (the document stays), then a new run.
  const abandoned = await BibleYearEnrollment.findOneAndUpdate(
    { userId, status: 'active' },
    { $set: { status: 'abandoned', lastActivityAt: now } },
    { new: false, projection: { _id: 1 } },
  ).lean<{ _id: unknown } | null>();
  try {
    return mutationResponse(await createRun(userId, restartWith as ParsedStart, now), now);
  } catch (error) {
    // A failed create must not leave the reader without their plan. Not on a
    // 409: another request's new run is active then.
    if (abandoned && !(error instanceof BibleYearError)) {
      try {
        await BibleYearEnrollment.updateOne(
          { _id: abandoned._id, status: 'abandoned' },
          { $set: { status: 'active' } },
        );
      } catch (restoreError) {
        console.error('[bible-year] restoring the previous run failed', restoreError);
      }
    }
    throw error;
  }
}

/** `$addToSet` per book onto the user's readChapters, canonical Dutch keys. */
export function readChaptersAddToSet(refs: readonly BibleYearRef[]): Record<string, { $each: number[] }> {
  const byBook = new Map<string, number[]>();
  for (const ref of refs) {
    const book = toCanonicalDutchBook(ref.book) ?? ref.book;
    if (!isSafeBookKey(book)) continue;
    const list = byBook.get(book) ?? [];
    if (!list.includes(ref.chapter)) list.push(ref.chapter);
    byBook.set(book, list);
  }
  const out: Record<string, { $each: number[] }> = {};
  for (const [book, chapters] of byBook) out[`readChapters.${book}`] = { $each: chapters };
  return out;
}

/**
 * POST /mark. Read: $addToSet readRefs, and - it is a manual "Gelezen" - the
 * same chapters onto the user's readChapters, WITHOUT chapter_read XP (the
 * plan pays per day instead). Unread: $pull readRefs only; readChapters, paid
 * days and XP are never taken back.
 */
export async function mark(
  userId: string,
  body: unknown,
  options: { now?: Date; isPro?: boolean } = {},
): Promise<BibleYearMutationResponse> {
  const now = options.now ?? new Date();
  await connectMongoDB();
  const active = await findActive(userId);
  if (!active) throw NO_PLAN();
  const { keys, read } = parseMarkBody(body, active);

  const updated = await BibleYearEnrollment.findOneAndUpdate(
    { _id: active._id, status: 'active' },
    read
      ? { $addToSet: { readRefs: { $each: keys } }, $set: { lastActivityAt: now } }
      : { $pull: { readRefs: { $in: keys } }, $set: { lastActivityAt: now } },
    { new: true },
  )
    .select(ENROLLMENT_FIELDS)
    .lean<LeanEnrollment | null>();
  if (!updated) throw NO_PLAN();
  if (!read) return mutationResponse(updated, now);

  const refs = keys.map(parseRefKey).filter((r): r is BibleYearRef => r !== null);
  const addToSet = readChaptersAddToSet(refs);
  if (Object.keys(addToSet).length > 0) {
    try {
      await User.updateOne({ _id: userId }, { $addToSet: addToSet });
    } catch (error) {
      // The plan tick stands; readChapters catches up the next time the chapter is opened.
      console.error('[bible-year] readChapters update failed', error);
    }
  }

  const { completed } = await settleProgress(userId, updated, now, Boolean(options.isPro));
  return mutationResponse(completed ? { ...updated, status: 'completed', completedAt: now } : updated, now);
}

/**
 * The reader's auto-tick, called by both last-read routes on every chapter
 * opened. One indexed findOneAndUpdate that matches nothing - and so writes
 * nothing - without a running plan or when the chapter is already ticked;
 * only then the pay/completion check (settleProgress).
 * Never throws: a failure here must not fail the read.
 */
export async function recordBibleYearChapter(
  userId: string,
  bookOrCode: string,
  chapter: unknown,
  options: { now?: Date; isPro?: boolean } = {},
): Promise<void> {
  try {
    const ref = toRef(bookOrCode, chapter);
    if (!ref) return;
    const key = refKey(ref.code, ref.chapter);
    const now = options.now ?? new Date();
    await connectMongoDB();
    const updated = await BibleYearEnrollment.findOneAndUpdate(
      { userId, status: 'active', readRefs: { $ne: key } },
      { $addToSet: { readRefs: key }, $set: { lastActivityAt: now } },
      { new: true },
    )
      .select('_id planKey track scheduleVersion startDate timeZone shiftDays status readRefs paidDays')
      .lean<SettleDoc | null>();
    if (!updated) return;
    await settleProgress(userId, updated, now, Boolean(options.isPro));
  } catch (error) {
    console.error('[bible-year] recording a chapter failed', error);
  }
}

/**
 * The notification schedule's plan lookup (lib/notificationSchedule.ts): one
 * indexed read, then pure schedule lookups per date. Null without a running plan.
 */
export async function getBibleYearDaysOnDates(
  userId: string,
  dates: readonly string[],
): Promise<Map<string, BibleYearDayOnDate> | null> {
  await connectMongoDB();
  const doc = await findActive(userId);
  return doc ? scheduleDaysOnDates(toProgressInput(doc), dates) : null;
}
