import connectMongoDB from '../mongodb';
import User from '../../models/User';
import FriendRequest from '../../models/FriendRequest';
import { isBlockedBetween } from './blocks';
import { firstNameOf, pickVariant, type CopyTokens, type SocialNotificationType } from '../notificationCopy';
import { isApnsConfigured, sendPushToUser } from '../push/send';

/**
 * The bridge between the four vriendenkring events and a push notification,
 * built the same way `lib/friends/milestones.ts` is built - and for the same
 * reason. Three rules hold for every function here:
 *
 * 1. **It never throws.** Each call is wrapped and a failure is logged and
 *    dropped. These run inside `lib/friends/service.ts`, next to the write that
 *    caused them, and losing somebody's comment because Apple refused a
 *    connection would be the wrong trade by a wide margin. Note that
 *    `sendPushToUser` already guarantees this; the wrapper here covers the
 *    reads that precede it, so the guarantee does not depend on the order the
 *    statements happen to be in.
 * 2. **Never the actor.** The person who tapped already knows what they did,
 *    and "Jij vindt dit mooi" is the single most embarrassing bug a social
 *    feature can ship. Every entry point checks and returns.
 * 3. **The push is not the record.** `GET /api/v1/notifications/social` is, and
 *    it answers from the collections themselves. So nothing here needs to
 *    persist a notification, nothing is lost when a push is suppressed, and
 *    Android - which gets no push at all - sees exactly the same events.
 *
 * The await is deliberate rather than a floating promise: a Vercel lambda may
 * freeze the moment the response is flushed, so a detached promise is a
 * notification that sometimes never goes out.
 *
 * THE COALESCING RULE, in one sentence: **the first three likes and the first
 * three comments on a post each push; the fourth and everything after it is
 * silent.** The counts it reads are the ones the feed already keeps -
 * `likes.length` and `commentCount` on the post - so the rule costs no extra
 * query and no extra state. The reasoning: the first like is news, the third is
 * confirmation that people saw it, and the twelfth is a phone buzzing in
 * someone's pocket about a thing they have already been told about three times.
 * Everything over the limit still shows up in the badge and in the social pull
 * response, so nothing is lost - only the buzz. Per post and per kind, so a
 * comment is never suppressed by likes; `apns-collapse-id` is set to the post
 * as well, so even those three replace one another on the lock screen instead
 * of stacking.
 */

/** Likes (and, separately, comments) on one post that will push. */
export const POST_NOTIFY_LIMIT = 3;

async function send(
  label: string,
  recipientId: string,
  actorId: string,
  type: SocialNotificationType,
  input: { tokens: CopyTokens; eventId: string; collapseId: string },
): Promise<void> {
  try {
    // Rule 2, before anything is read.
    if (String(recipientId) === String(actorId)) return;

    // Off is off: with no APNs key there is nothing to send, and this returns
    // before the two reads below rather than after them. The same precedent as
    // `contactPepper()` in discovery.ts - the feature is simply not there.
    if (!isApnsConfigured()) return;

    if (await isBlockedBetween(recipientId, actorId)) return;

    const rendered = pickVariant(type, input.tokens, {
      // Deterministic on the event, so a retry after a crash renders the same
      // message rather than a second, differently worded one.
      seed: `${recipientId}:${input.eventId}`,
    });

    await sendPushToUser(recipientId, type, rendered, {
      collapseId: input.collapseId,
      eventId: input.eventId,
    });
  } catch (error) {
    // Logged, never rethrown. See rule 1.
    console.error(`[friends-notify] ${label} niet verstuurd aan ${recipientId}`, error);
  }
}

/**
 * The actor's first name, or nothing.
 *
 * Nothing, rather than a fallback string, because every copy pool keeps
 * variants that need no name - so an account whose `name` is an email address
 * (which OAuth does) gets "Iemand reageerde" from the pool instead of having
 * its address read out on a stranger's lock screen.
 */
async function actorFirstName(actorId: string): Promise<string | undefined> {
  await connectMongoDB();
  const actor = await User.findById(actorId).select('name').lean<{ name?: string } | null>();
  return firstNameOf(actor?.name);
}

/**
 * A new incoming vriendschapsverzoek.
 *
 * The request's own id is looked up here rather than passed in, so the caller in
 * service.ts stays one line and - more to the point - so the lookup only happens
 * when there is a push to send. `sendRequest` writes the row with a plain
 * `updateOne` upsert and does not need the id for anything else; making it a
 * `findOneAndUpdate` just to hand an id to a notifier that is usually switched
 * off would be the wrong way round.
 *
 * There is exactly one request document per ordered pair (the unique index), so
 * the id is stable even when a declined request is re-opened, and the event id
 * matches what `GET /api/v1/notifications/social` reports for the same request.
 */
export async function notifyFriendRequest(recipientId: string, actorId: string): Promise<void> {
  if (String(recipientId) === String(actorId) || !isApnsConfigured()) return;
  try {
    await connectMongoDB();
    const request = await FriendRequest.findOne({ fromUserId: actorId, toUserId: recipientId })
      .select('_id')
      .lean<{ _id: unknown } | null>();
    if (!request) return;
    await send('verzoek', recipientId, actorId, 'friend_request', {
      tokens: { vriend: await actorFirstName(actorId), vriendId: String(actorId) },
      eventId: `request:${String(request._id)}`,
      // One pending request per pair, so collapsing on the pair is exact.
      collapseId: `request:${actorId}`,
    });
  } catch (error) {
    console.error(`[friends-notify] verzoek niet verstuurd aan ${recipientId}`, error);
  }
}

/**
 * A request the recipient sent has been accepted.
 *
 * `recipientId` is the person who asked and `actorId` the person who said yes -
 * the opposite way round from `notifyFriendRequest`, which is worth stating
 * because getting it backwards would notify the wrong half of the pair.
 */
export async function notifyRequestAccepted(
  recipientId: string,
  actorId: string,
  requestId: string,
): Promise<void> {
  if (String(recipientId) === String(actorId) || !isApnsConfigured()) return;
  await send('geaccepteerd verzoek', recipientId, actorId, 'friend_accepted', {
    tokens: { vriend: await actorFirstName(actorId), vriendId: String(actorId) },
    eventId: `accepted:${requestId}`,
    collapseId: `accepted:${actorId}`,
  });
}

/**
 * A like on the recipient's post.
 *
 * `priorLikes` is how many likes the post had *before* this one, which the
 * service already has in hand. Over the limit, nothing is sent; the event is
 * still in the social pull response.
 */
export async function notifyPostLike(input: {
  authorId: string;
  actorId: string;
  postId: string;
  priorLikes: number;
}): Promise<void> {
  if (String(input.authorId) === String(input.actorId) || !isApnsConfigured()) return;
  if (input.priorLikes >= POST_NOTIFY_LIMIT) return;
  await send('hart', input.authorId, input.actorId, 'post_like', {
    tokens: {
      vriend: await actorFirstName(input.actorId),
      vriendId: String(input.actorId),
      berichtId: String(input.postId),
    },
    eventId: `like:${input.postId}:${input.actorId}`,
    collapseId: `like:${input.postId}`,
  });
}

/** A comment on the recipient's post. `priorComments` excludes this one. */
export async function notifyPostComment(input: {
  authorId: string;
  actorId: string;
  postId: string;
  commentId: string;
  body: string;
  priorComments: number;
}): Promise<void> {
  if (String(input.authorId) === String(input.actorId) || !isApnsConfigured()) return;
  if (input.priorComments >= POST_NOTIFY_LIMIT) return;
  await send('reactie', input.authorId, input.actorId, 'post_comment', {
    tokens: {
      vriend: await actorFirstName(input.actorId),
      vriendId: String(input.actorId),
      berichtId: String(input.postId),
      // Quoted on the lock screen, trimmed at a word boundary by the copy layer.
      reactie: input.body,
    },
    eventId: `comment:${input.commentId}`,
    collapseId: `comment:${input.postId}`,
  });
}
