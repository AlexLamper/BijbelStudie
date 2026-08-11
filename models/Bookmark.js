import mongoose from "mongoose";

/**
 * Chapter/verse bookmarks. Mobile-first, but nothing here is mobile-specific —
 * the website can adopt the same collection later.
 *
 * `clientId` is a UUID generated on the device so an offline create that is
 * retried after a flaky upload cannot produce two rows.
 */
const BookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: { type: String, required: true },
    book: { type: String, required: true },
    chapter: { type: Number, required: true },
    verse: { type: Number },
    version: { type: String },
    label: { type: String },
  },
  { timestamps: true }
);

BookmarkSchema.index({ userId: 1, clientId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Bookmark || mongoose.model("Bookmark", BookmarkSchema);
