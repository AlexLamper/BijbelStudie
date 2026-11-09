import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import connectMongoDB from './mongodb';
import User from '../models/User';
import { isAdminEmail } from './adminEmails';
import { verifyAccessToken } from './mobileJwt';
import { resolveIsPro, resolveProSource, resolveProExpiresAt, type ProSource } from './mobilePremium';
import type { Limits } from './entitlements';
import {
  accountLimits,
  isCompOnly,
  isNothing,
  trialState,
  trialSummary,
  type ReverseTrialFields,
  type TrialSummary,
} from './reverseTrialRules';
import { touchReverseTrial } from './reverseTrial';

/**
 * One caller-resolution helper for both clients.
 *
 * The website sends a NextAuth session cookie; the mobile apps send
 * `Authorization: Bearer <access jwt>`. Handlers that call `resolveUser` work
 * for either, which is what lets `/api/v1/*` reuse the same business logic
 * without the website's routes changing at all.
 */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  isPro: boolean;
  proSource: ProSource;
  proExpiresAt: Date | null;
  /** The reverse trial as the clients see it; null on an account without one. */
  trial: TrialSummary | null;
  /** What this account may do right now - Pro, free, or free with a personal limit. */
  limits: Limits;
  /** The stored trial, for `recordTrialUsage` - lets it skip the query outside a trial. */
  reverseTrial: ReverseTrialFields | null;
};

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

type UserDoc = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  image?: string;
  isAdmin?: boolean;
  subscribed?: boolean;
  storePremium?: boolean;
  storePremiumPlatform?: 'apple' | 'google' | null;
  storePremiumExpiresAt?: Date | null;
  compedProUntil?: Date | null;
  createdAt?: Date | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  reverseTrial?: ReverseTrialFields | null;
};

/** A hydrated mongoose document reads its nested paths through getters; plain data is safer to pass around. */
function plainTrial(doc: UserDoc): ReverseTrialFields | null {
  const source = doc as UserDoc & { toObject?: () => UserDoc };
  const plain = typeof source.toObject === 'function' ? source.toObject() : doc;
  const trial = plain.reverseTrial;
  return trial && trial.startedAt ? { ...trial, days: trial.days ? [...trial.days] : trial.days } : null;
}

export function toAuthUser(doc: UserDoc, now: Date = new Date()): AuthUser {
  const email = doc.email ?? '';
  const adminByEmail = isAdminEmail(email);
  const isPro = resolveIsPro(doc, adminByEmail);
  const trial = plainTrial(doc);
  let proSource = resolveProSource(doc, adminByEmail);
  // A comp that exists because of the reverse trial is not a web purchase:
  // labelled `trial`, the app may offer to buy, and must not say "via web".
  if (proSource === 'stripe' && isCompOnly(doc) && trialState(trial, now) === 'active') proSource = 'trial';
  return {
    id: doc._id.toString(),
    name: doc.name ?? '',
    email,
    image: doc.image ?? null,
    isAdmin: Boolean(doc.isAdmin) || adminByEmail,
    isPro,
    proSource,
    proExpiresAt: resolveProExpiresAt(doc),
    trial: trialSummary(trial, isPro, now),
    limits: accountLimits(trial, isPro, now),
    reverseTrial: trial,
  };
}

/**
 * Counts today as an active trial day (and starts or closes the trial) before
 * the caller's entitlement is read, so the first request after midnight
 * already sees the right answer. Returns the document to use: the same one,
 * or a fresh read when something was written - once per active day at most.
 */
export async function touched<T extends UserDoc>(
  doc: T,
  reload: () => Promise<T | null>,
  platform: 'web' | null = null,
): Promise<T> {
  const plan = await touchReverseTrial(
    {
      _id: doc._id,
      createdAt: doc.createdAt,
      subscribed: doc.subscribed,
      compedProUntil: doc.compedProUntil,
      storePremium: doc.storePremium,
      stripeSubscriptionId: doc.stripeSubscriptionId,
      subscriptionStatus: doc.subscriptionStatus,
      reverseTrial: plainTrial(doc),
    },
    { platform },
  );
  if (isNothing(plan)) return doc;
  return (await reload()) ?? doc;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Returns the caller, or null. Never logs the token.
 */
export async function resolveUser(req: Request): Promise<AuthUser | null> {
  const token = bearerToken(req);

  if (token) {
    const claims = await verifyAccessToken(token);
    if (!claims) return null;
    await connectMongoDB();
    const doc = await User.findById(claims.sub);
    if (!doc) return null;
    return toAuthUser(await touched(doc, () => User.findById(claims.sub), null));
  }

  // Fall back to the website's cookie session so a handler can be shared.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  await connectMongoDB();
  // The session callback (lib/authOptions.ts) has already touched the trial
  // for this website visit.
  const doc = await User.findOne({ email: session.user.email });
  return doc ? toAuthUser(doc) : null;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await resolveUser(req);
  if (!user) throw new UnauthorizedError();
  return user;
}
