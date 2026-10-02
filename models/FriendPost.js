import mongoose from "mongoose";

/**
 * One card in the vriendenkring feed.
 *
 * A post is a COPY, never a reference: editing the note it came from does not
 * change what the kring saw, and deleting that note deletes the post. That is
 * what `sourceId` is for - it identifies the origin for deletion and
 * de-duplication, and is not resolved when rendering.
 *
 * Likes are embedded because a kring is tens of people, so the array stays
 * small and `likedByMe` needs no second query. Comments are their own
 * collection: they grow and need paging.
 */
const FriendPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** verse | milestone | note - the app renders an unknown kind as a note. */
    kind: { type: String, required: true },
    /** "Johannes 3:16" for a verse or a note on a passage. */
    reference: { type: String },
    body: { type: String, default: "" },
    /** The note id, daytext date or badge key this was made from. */
    sourceId: { type: String },
    likes: {
      type: [
        {
          _id: false,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    /** Kept by `$inc` beside FriendPostComment, so the feed needs no join. */
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// The feed: the posts of a set of friends, newest first.
FriendPostSchema.index({ userId: 1, createdAt: -1 });
// Milestones are written server-side on events that can fire twice (a retry,
// two devices); the service guards on this before inserting.
FriendPostSchema.index({ userId: 1, kind: 1, sourceId: 1 });

export default mongoose.models.FriendPost ||
  mongoose.model("FriendPost", FriendPostSchema);
