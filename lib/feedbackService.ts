/**
 * The server side of asking a question: who may be asked, what to ask, and
 * what to do with the answer.
 *
 * The rules themselves are elsewhere and pure - `feedbackPrompts.ts` (what may
 * be asked), `feedbackEligibility.ts` (whether it may be asked now),
 * `feedbackSegments.ts` (who this reader is). This module is the part that
 * touches Mongo, and it is written to be cheap: Active CPU on Vercel is a
 * standing constraint, so a decision costs one FeedbackState read and, only
 * when a prompt is actually served, one write. Everything else the caller
 * already has is passed in rather than fetched again.
 */

import connectMongoDB from './mongodb';
import Feedback from '../models/Feedback';
import FeedbackState from '../models/FeedbackState';
import StudyEnrollment from '../models/StudyEnrollment.js';
import User from '../models/User';
import { tenureBucket } from './analyticsSchema';
import {
  choosePrompt,
  findPromptState,
  microSignalAllowed,
  shownUpdate,
  type FeedbackStateLike,
} from './feedbackEligibility';
import {
  PROMPTS,
  promptsFor,
  serialisePrompt,
  validateAnswers,
  type PromptId,
  type SerialisedPrompt,
  type Segment,
  type Touchpoint,
} from './feedbackPrompts';
import { lessonsBucket, resolveSegment, streakBucket, type SegmentInput } from './feedbackSegments';
import { issueToken, verifyToken } from './feedbackToken';

/** Everything a stored answer needs to be interpretable later. */
export interface FeedbackContext {
  routeKey?: string | null;
  studyId?: string | null;
  lessonDay?: number | null;
  stepKey?: string | null;
  quizId?: string | null;
  quizQuestionId?: string | null;
  answeredCorrectly?: boolean | null;
  planId?: string | null;
  platform?: 'web' | 'ios' | 'android' | null;
  appVersion?: string | null;
  isPro?: boolean | null;
}

const EMPTY_STATE: FeedbackStateLike = {};

export async function readState(userId: string): Promise<FeedbackStateLike> {
  const doc = await FeedbackState.findOne({ userId }).lean<FeedbackStateLike>();
  return doc ?? EMPTY_STATE;
}

/**
 * The reader's state, for the segment and the context buckets.
 *
 * One User read plus one enrollment read. `lessonsCompleted` is summed off the
 * enrollments rather than counted in StudyProgress: the number is already
 * maintained there by `syncEnrollmentAfterLesson`, and a sum over a handful of
 * small documents is cheaper than a count over the whole ledger.
 */
export async function readReaderState(
  userId: string,
  overrides: Partial<SegmentInput> = {},
): Promise<SegmentInput> {
  const [user, enrollments] = await Promise.all([
    User.findById(userId)
      .select('createdAt streak subscribed subscriptionStatus cancelAtPeriodEnd storePremium')
      .lean<Record<string, unknown>>(),
    StudyEnrollment.find({ userId })
      .select('lessonsCompleted lastActivityAt')
      .lean<{ lessonsCompleted?: number; lastActivityAt?: Date }[]>(),
  ]);

  const lessonsCompleted = (enrollments ?? []).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(row.lessonsCompleted ?? 0)),
    0,
  );
  const lastActivityAt = (enrollments ?? [])
    .map((row) => row.lastActivityAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    createdAt: (user?.createdAt as Date | undefined) ?? null,
    streak: (user?.streak as number | undefined) ?? 0,
    isPro: Boolean(user?.subscribed) || Boolean(user?.storePremium),
    subscriptionStatus: (user?.subscriptionStatus as string | undefined) ?? null,
    cancelAtPeriodEnd: Boolean(user?.cancelAtPeriodEnd),
    lessonsCompleted,
    lastActivityAt,
    ...overrides,
  };
}

/** The bucketed context block, built from the reader state. */
export function buildContextBuckets(reader: SegmentInput, now: Date = new Date()) {
  const created = reader.createdAt ? new Date(reader.createdAt) : null;
  const tenureDays = created ? (now.getTime() - created.getTime()) / 86_400_000 : 0;
  return {
    streakBucket: streakBucket(reader.streak),
    lessonsBucket: lessonsBucket(reader.lessonsCompleted),
    tenureBucket: tenureBucket(tenureDays),
  };
}

export interface NextPromptArgs {
  userId: string;
  touchpoint: Touchpoint;
  context?: { studyId?: string | null; lessonDay?: number | null };
  /** Passed in when the caller already knows it, to save a query. */
  segment?: Segment;
  platform?: 'web' | 'ios' | 'android';
  now?: Date;
}

/**
 * The prompt to show for this touchpoint, or null.
 *
 * Records "shown" as part of answering, because a prompt the reader saw has
 * cost its budget whether or not they answer it. Recording only on submit
 * would let a reader who skips be asked again tomorrow, which is the exact
 * behaviour the budget exists to prevent.
 */
export async function nextPrompt({
  userId,
  touchpoint,
  context = {},
  segment,
  platform = 'web',
  now = new Date(),
}: NextPromptArgs): Promise<SerialisedPrompt | null> {
  const candidates = promptsFor(touchpoint);
  if (candidates.length === 0) return null;

  await connectMongoDB();
  const state = await readState(userId);
  if (state.optedOut) return null;

  const readerSegment = segment ?? resolveSegment(await readReaderState(userId), now);

  const promptId = choosePrompt(candidates, {
    state,
    segment: readerSegment,
    now,
    platform,
    userId,
  });
  if (!promptId) return null;

  await markShown(userId, promptId, state, now);
  return serialisePrompt(promptId, issueToken(userId, promptId, context, now));
}

async function markShown(
  userId: string,
  promptId: PromptId,
  state: FeedbackStateLike,
  now: Date,
): Promise<void> {
  const budget = shownUpdate(promptId, state, now);
  const existing = findPromptState(state, promptId);

  // Two writes rather than one only when the per-prompt row does not exist
  // yet: `$push` and a positional `$inc` on the same array cannot be combined.
  if (existing) {
    await FeedbackState.updateOne(
      { userId, 'prompts.promptId': promptId },
      {
        ...budget,
        $inc: {
          ...((budget.$inc as Record<string, number>) ?? {}),
          'prompts.$.shownCount': 1,
        },
        $set: {
          ...((budget.$set as Record<string, unknown>) ?? {}),
          'prompts.$.lastShownAt': now,
        },
      },
    );
    return;
  }

  await FeedbackState.updateOne(
    { userId },
    {
      ...budget,
      $setOnInsert: { userId },
      $push: { prompts: { promptId, shownCount: 1, lastShownAt: now } },
    },
    { upsert: true },
  );
}

export interface SubmitArgs {
  userId: string;
  promptId: string;
  token: unknown;
  answers: unknown;
  context?: FeedbackContext;
  now?: Date;
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; code: 'UNKNOWN_PROMPT' | 'BAD_TOKEN' | 'INVALID_ANSWERS' | 'OPTED_OUT' };

/**
 * Stores one prompted answer.
 *
 * The token is checked before anything is written: a submission for a prompt
 * this reader was never served is not stored at all, so the response rate stays
 * a real ratio rather than an inflated one.
 */
export async function submitResponse({
  userId,
  promptId,
  token,
  answers,
  context = {},
  now = new Date(),
}: SubmitArgs): Promise<SubmitResult> {
  const def = PROMPTS[promptId];
  if (!def) return { ok: false, code: 'UNKNOWN_PROMPT' };

  if (!verifyToken(token, userId, promptId, context, now)) {
    return { ok: false, code: 'BAD_TOKEN' };
  }

  const validated = validateAnswers(def, answers);
  if (!validated) return { ok: false, code: 'INVALID_ANSWERS' };

  await connectMongoDB();
  const state = await readState(userId);
  if (state.optedOut) return { ok: false, code: 'OPTED_OUT' };

  const reader = await readReaderState(userId, {
    isPro: context.isPro ?? undefined,
  });
  const segment = resolveSegment(reader, now);
  const buckets = buildContextBuckets(reader, now);

  await Feedback.create({
    userId,
    category: 'other',
    // The answer lives in `answers`; `message` carries the free text as well so
    // the existing inbox and the admin list keep working unchanged.
    message: validated.map((entry) => entry.value).join(' | ').slice(0, 2000),
    touchpoint: def.touchpoint,
    promptId,
    promptVersion: def.version,
    answers: validated,
    segment,
    context: {
      routeKey: context.routeKey ?? null,
      studyId: context.studyId ?? null,
      lessonDay: context.lessonDay ?? null,
      stepKey: context.stepKey ?? null,
      quizId: context.quizId ?? null,
      quizQuestionId: context.quizQuestionId ?? null,
      answeredCorrectly: context.answeredCorrectly ?? null,
      planId: context.planId ?? null,
      platform: context.platform ?? 'web',
      appVersion: context.appVersion ?? null,
      locale: 'nl',
      isPro: reader.isPro ?? null,
      ...buckets,
    },
  });

  await FeedbackState.updateOne(
    { userId, 'prompts.promptId': promptId },
    { $set: { 'prompts.$.answeredAt': now } },
  );

  return { ok: true };
}

/** A skip. Costs the same budget as an answer, and is worth counting. */
export async function recordDismiss(
  userId: string,
  promptId: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!PROMPTS[promptId]) return false;
  await connectMongoDB();
  const state = await readState(userId);
  const existing = findPromptState(state, promptId);

  if (existing) {
    await FeedbackState.updateOne(
      { userId, 'prompts.promptId': promptId },
      { $inc: { 'prompts.$.skippedCount': 1 }, $set: { 'prompts.$.lastShownAt': now } },
    );
  } else {
    await FeedbackState.updateOne(
      { userId },
      {
        $setOnInsert: { userId },
        $push: { prompts: { promptId, shownCount: 1, skippedCount: 1, lastShownAt: now } },
        $set: { lastPromptAt: now },
      },
      { upsert: true },
    );
  }
  return true;
}

/** Permanent, one tap, honoured forever. */
export async function setOptedOut(userId: string, optedOut: boolean): Promise<void> {
  await connectMongoDB();
  await FeedbackState.updateOne(
    { userId },
    { $setOnInsert: { userId }, $set: { optedOut } },
    { upsert: true },
  );
}

/** Whether one more one-tap micro-signal may be collected from this reader. */
export async function canCollectMicroSignal(userId: string): Promise<boolean> {
  await connectMongoDB();
  return microSignalAllowed(await readState(userId));
}

export async function countMicroSignal(userId: string): Promise<void> {
  await connectMongoDB();
  await FeedbackState.updateOne(
    { userId },
    { $setOnInsert: { userId }, $inc: { microSignalCount: 1 } },
    { upsert: true },
  );
}
