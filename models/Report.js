import mongoose from "mongoose";

/**
 * A reader reporting a post or a comment in their vriendenkring.
 *
 * Its own collection rather than a flag on the post: a report is about the
 * reporter as much as about the content, several people can report the same
 * card, and the moderation queue has to survive the post being deleted. The
 * reason is a storage slug (lib/friends/types.ts `ReportReason`), never the
 * Dutch label - the clients own the wording.
 *
 * `targetUserId` is denormalised off the post or comment at report time so the
 * queue can group by author without a join, and so account deletion
 * (lib/accountPurge.ts) can find every report about a person.
 *
 * One report per reporter per target: the unique index below, with the service
 * writing through `$set` + `$setOnInsert` upsert, so a second tap updates the
 * reason instead of filling the queue with duplicates.
 */
const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** post | comment */
    targetKind: {
      type: String,
      required: true,
      enum: ["post", "comment"],
    },
    /** The FriendPost or FriendPostComment id. */
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    /** Who wrote the reported thing, as it stood when reported. */
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reason: {
      type: String,
      required: true,
      enum: ["spam", "inappropriate", "hate", "harassment", "misinformation", "other"],
    },
    /** The reporter's own words. Their free text, so deletion clears it. */
    note: { type: String, default: "" },
    /** new | reviewed | actioned - the moderation queue's own state. */
    status: {
      type: String,
      required: true,
      default: "new",
      enum: ["new", "reviewed", "actioned"],
    },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// One report per reporter per target - see the upsert in lib/friends/service.ts.
ReportSchema.index({ reporterId: 1, targetKind: 1, targetId: 1 }, { unique: true });
// The queue: what is new, oldest first is how it gets worked through.
ReportSchema.index({ status: 1, createdAt: 1 });
// "How often was this card reported" and "how often was this author reported".
ReportSchema.index({ targetKind: 1, targetId: 1 });
ReportSchema.index({ targetUserId: 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
