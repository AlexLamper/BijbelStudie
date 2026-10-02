import mongoose from "mongoose";

/**
 * A vriendschapsverzoek. One document per ordered pair, so asking twice
 * updates the same row rather than filling someone's inbox; the unique index
 * is what enforces that.
 *
 * `status` is a small state machine, driven only by `lib/friends/service.ts`:
 * pending -> accepted | declined | cancelled. An accepted request keeps its
 * document as the record of who asked; the vriendschap itself lives in
 * `Friendship`.
 */
const FriendRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
    /** contacts | code | link | qr - how the sender found the other. */
    source: { type: String, default: "code" },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

FriendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
// The inbox and the outbox.
FriendRequestSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
FriendRequestSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });

export default mongoose.models.FriendRequest ||
  mongoose.model("FriendRequest", FriendRequestSchema);
