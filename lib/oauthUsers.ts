import User from '../models/User';
import { findUserByEmail, normaliseEmail, type UserModelLike } from './userLookup';

/**
 * "Find, link or create" for the mobile OAuth routes (`/api/v1/auth/google`,
 * `/api/v1/auth/apple`).
 *
 * Every login *after* the first is a single indexed `findOne` on the provider
 * id and cannot fail. The first one is the whole problem surface, and it used
 * to be written as find-then-`create` plus a full-document `save()` - two
 * separate ways to turn a perfectly good sign-in into a 500:
 *
 * 1. **The insert was not atomic.** `findOne` and `create` are two round trips,
 *    so two requests for the same brand-new address both saw "no user" and both
 *    inserted. The loser hit the unique index on `email` and threw E11000,
 *    which `handleV1Error` reported as `INTERNAL_ERROR`. It only ever happened
 *    on a first login, only when two requests overlapped (a double tap, the
 *    app's `interrupted` retry on Android, or a website sign-in landing at the
 *    same moment), which is exactly what made it look random. The registration
 *    route already knew about this race and answered `EMAIL_TAKEN`; the OAuth
 *    routes did not.
 * 2. **Linking used `user.save()`.** That validates the *entire* document, not
 *    the one field being written, so any account whose stored document no
 *    longer satisfies the current schema (a legacy row with no `name`, an
 *    unknown `subscriptionStatus`, a poisoned `readChapters` key) threw a
 *    ValidationError. Again first-login-only: once `googleId` is set the link
 *    branch never runs again for that user, so a single failing account looked
 *    like an intermittent outage rather than a permanent one.
 *
 * Both are fixed the same way: one atomic upsert for the create, targeted
 * `$set` updates for the link, and E11000 treated as "someone else won the
 * race, go read their document" instead of as a server fault.
 */

export type OAuthProvider = 'google' | 'apple';

const ID_FIELD: Record<OAuthProvider, 'googleId' | 'appleId'> = {
  google: 'googleId',
  apple: 'appleId',
};

/** Mongo's duplicate-key error, whether it arrives as a driver error or wrapped
 * by mongoose (`MongoServerError` keeps `code` on the outer object). */
export function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: number | string }).code;
  if (code === 11000 || code === '11000') return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause ? isDuplicateKeyError(cause) : false;
}

export type ProvisionParams = {
  provider: OAuthProvider;
  /** The provider's stable subject claim. */
  providerId: string;
  email: string;
  name: string;
  image?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserDoc = any;

async function attachProviderId(
  model: UserModelLike,
  doc: UserDoc,
  idField: string,
  providerId: string,
  image?: string | null,
): Promise<UserDoc> {
  const set: Record<string, unknown> = { [idField]: providerId };
  // Only fill a gap - never overwrite an avatar the user chose themselves.
  if (!doc.image && image) set.image = image;

  // A targeted update, deliberately not `doc.save()`: this must not re-validate
  // fields it is not writing. See the note at the top of the file.
  const updated = await model.findOneAndUpdate({ _id: doc._id }, { $set: set }, { new: true });
  return updated ?? doc;
}

export async function provisionOAuthUser(
  params: ProvisionParams,
  model: UserModelLike = User,
): Promise<UserDoc> {
  const idField = ID_FIELD[params.provider];
  const email = normaliseEmail(params.email);

  // 1. Known identity. The path every login but the first takes.
  const byProvider = (await model.findOne({ [idField]: params.providerId })) as UserDoc;
  if (byProvider) return byProvider;

  // 2. An account already exists for this address - a website registration, or
  //    the other provider. Case-insensitive on purpose: linking is what stops a
  //    second, provider-only account being created for the same person.
  const byEmail = (await findUserByEmail(params.email, model)) as UserDoc;
  if (byEmail) {
    return byEmail[idField] === params.providerId
      ? byEmail
      : attachProviderId(model, byEmail, idField, params.providerId, params.image);
  }

  // 3. Genuinely new. One atomic upsert, so a racing duplicate resolves to the
  //    same document instead of a duplicate-key 500.
  const insert: Record<string, unknown> = {
    name: params.name,
    email,
    image: params.image ?? '',
    bio: '',
    [idField]: params.providerId,
  };

  try {
    const doc = (await model.findOneAndUpdate(
      { email },
      { $setOnInsert: insert },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )) as UserDoc;
    if (!doc) throw new Error('upsert returned no document');
    // The filter matched an existing row instead of inserting: another request
    // (or the website's NextAuth callback) created it between steps 2 and 3.
    if (!doc[idField]) {
      return attachProviderId(model, doc, idField, params.providerId, params.image);
    }
    return doc;
  } catch (error) {
    // Two upserts can still collide on the unique index before either has
    // committed. That is not a failure - the other request created exactly the
    // account we wanted.
    if (!isDuplicateKeyError(error)) throw error;
    const existing = (await findUserByEmail(params.email, model)) as UserDoc;
    if (!existing) throw error;
    return existing[idField]
      ? existing
      : attachProviderId(model, existing, idField, params.providerId, params.image);
  }
}
