import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import connectMongoDB from './mongodb';
import User from '../models/User';
import { isAdminEmail } from './adminEmails';
import { verifyAccessToken } from './mobileJwt';
import { resolveIsPro, resolveProSource, resolveProExpiresAt, type ProSource } from './mobilePremium';

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
};

export function toAuthUser(doc: UserDoc): AuthUser {
  const email = doc.email ?? '';
  const adminByEmail = isAdminEmail(email);
  return {
    id: doc._id.toString(),
    name: doc.name ?? '',
    email,
    image: doc.image ?? null,
    isAdmin: Boolean(doc.isAdmin) || adminByEmail,
    isPro: resolveIsPro(doc, adminByEmail),
    proSource: resolveProSource(doc, adminByEmail),
    proExpiresAt: resolveProExpiresAt(doc),
  };
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
    return doc ? toAuthUser(doc) : null;
  }

  // Fall back to the website's cookie session so a handler can be shared.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  await connectMongoDB();
  const doc = await User.findOne({ email: session.user.email });
  return doc ? toAuthUser(doc) : null;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await resolveUser(req);
  if (!user) throw new UnauthorizedError();
  return user;
}
