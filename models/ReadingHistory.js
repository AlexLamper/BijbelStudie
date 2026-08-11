import mongoose from "mongoose";

/**
 * Per-chapter reading history for the mobile reader: what was read, when, and
 * where the reader stopped scrolling ("continue reading").
 *
 * Distinct from `ReadingSession`, which only counts minutes for the website's
 * weekly-stats widget and carries no chapter information.
 */
const ReadingHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: { type: String, required: true },
    book: { type: String, required: true },
    chapter: { type: Number, required: true },
    version: { type: String, required: true },
    /** 0..1 scroll fraction, so the reader reopens where it was left. */
    scrollProgress: { type: Number, default: 0, min: 0, max: 1 },
    readAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ReadingHistorySchema.index({ userId: 1, clientId: 1 }, { unique: true });
ReadingHistorySchema.index({ userId: 1, readAt: -1 });

export default mongoose.models.ReadingHistory ||
  mongoose.model("ReadingHistory", ReadingHistorySchema);
