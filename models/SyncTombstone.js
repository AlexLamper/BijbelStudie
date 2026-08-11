import mongoose from "mongoose";

/**
 * Deletion tombstones for the mobile sync protocol.
 *
 * Why a separate collection instead of a `deletedAt` column on each model:
 * the website's existing `/api/notes` route has no idea about soft deletes, so
 * flagging a Note as deleted would leave it visible on the web. Recording the
 * deletion here keeps the website's behaviour identical while still giving an
 * offline device something to replay against — a device that has been offline
 * for a week must learn the row is gone, and an absent row is indistinguishable
 * from a row it has not synced yet.
 *
 * Tombstones are kept for 180 days; a device offline longer than that must do
 * a full resync (`POST /api/v1/sync` with no `since`).
 */
const SyncTombstoneSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      required: true,
      enum: ["note", "highlight", "bookmark", "reading-history"],
    },
    clientId: { type: String, required: true },
    deletedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SyncTombstoneSchema.index({ userId: 1, kind: 1, clientId: 1 }, { unique: true });
SyncTombstoneSchema.index({ userId: 1, deletedAt: -1 });
SyncTombstoneSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default mongoose.models.SyncTombstone ||
  mongoose.model("SyncTombstone", SyncTombstoneSchema);
