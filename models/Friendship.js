import mongoose from "mongoose";

/**
 * One document per vriendschap, not two: the pair is stored with the lower
 * id first (`userAId < userBId` as hex strings), so "are these two friends"
 * is one indexed lookup and a duplicate is impossible whichever side asks.
 * `lib/friends/service.ts` is the only writer and orders the pair itself.
 *
 * A kring is reciprocal and symmetric - there is no follower direction here.
 * Who asked is remembered on the FriendRequest, not on the vriendschap.
 */
const FriendshipSchema = new mongoose.Schema(
  {
    userAId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userBId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** How the pair came about: contacts | code | link | qr. */
    source: { type: String, default: "code" },
  },
  { timestamps: true }
);

FriendshipSchema.index({ userAId: 1, userBId: 1 }, { unique: true });
// The feed and the kring list read from whichever side the caller is on.
FriendshipSchema.index({ userAId: 1 });
FriendshipSchema.index({ userBId: 1 });

export default mongoose.models.Friendship ||
  mongoose.model("Friendship", FriendshipSchema);
