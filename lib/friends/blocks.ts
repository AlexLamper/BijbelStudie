import mongoose from 'mongoose';
import connectMongoDB from '../mongodb';
import FriendProfile from '../../models/FriendProfile';

/**
 * The block rule, on its own, importable without pulling in the service.
 *
 * `lib/friends/service.ts` has a private `blockedBetween(userId)` that returns
 * the whole set, and this is deliberately not a re-export of it: the notifier
 * is called *from* service.ts, so importing service.ts back would make a
 * require cycle between the two. `lib/friends/milestones.ts` avoids the same
 * cycle by only ever being called from outside the service; the notifier cannot,
 * because the events it reacts to are the service's own writes.
 *
 * A block has to work in both directions to mean anything: whoever drew the
 * line, neither side hears from the other again.
 */

const { ObjectId } = mongoose.Types;

function oid(value: string): mongoose.Types.ObjectId {
  return new ObjectId(value);
}

/**
 * True when either of these two has blocked the other.
 *
 * The pair form rather than the set form, because the notifier always knows
 * both ids and a `countDocuments` on two indexed paths is cheaper than reading
 * everyone a person ever blocked.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(a) || !mongoose.isValidObjectId(b)) return false;
  await connectMongoDB();
  const found = await FriendProfile.exists({
    $or: [
      { userId: oid(a), blocked: oid(b) },
      { userId: oid(b), blocked: oid(a) },
    ],
  });
  return Boolean(found);
}

/** Everyone blocked in either direction, as ids. For a fan-out, not a pair. */
export async function blockedIdsFor(userId: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (!mongoose.isValidObjectId(userId)) return out;
  await connectMongoDB();
  const id = oid(userId);

  const mine = await FriendProfile.findOne({ userId: id })
    .select('blocked')
    .lean<{ blocked?: mongoose.Types.ObjectId[] } | null>();
  const theirs = await FriendProfile.find({ blocked: id })
    .select('userId')
    .lean<{ userId: mongoose.Types.ObjectId }[]>();

  for (const value of mine?.blocked ?? []) out.add(String(value));
  for (const row of theirs) out.add(String(row.userId));
  return out;
}
