import mongoose from "mongoose";

/**
 * A reaction under a post. Its own collection rather than an embedded array:
 * comments grow without a natural bound and are paged, where likes are not.
 * `FriendPost.commentCount` is kept alongside with `$inc` so the feed query
 * needs no join.
 */
const FriendPostCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FriendPost",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

FriendPostCommentSchema.index({ postId: 1, createdAt: 1 });

export default mongoose.models.FriendPostComment ||
  mongoose.model("FriendPostComment", FriendPostCommentSchema);
