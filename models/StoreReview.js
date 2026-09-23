import mongoose from "mongoose";

/**
 * One customer review as the App Store (and later Google Play) reported it.
 *
 * Why a collection instead of a generated JSON file: Vercel's runtime
 * filesystem is read-only, so the daily import cron has nowhere to write except
 * the database. It is also the only place the moderation flags below can live,
 * because they are ours and not the store's.
 *
 * Every field except `hidden`/`featured` is a copy of what the store said. The
 * import overwrites those on every run (a reviewer can edit a review, and Apple
 * hands back the edited text under the same id) and leaves the moderation flags
 * alone - see `upsertStoreReviews` in lib/storeReviews.ts.
 */
const DeveloperResponseSchema = new mongoose.Schema(
  {
    body: { type: String, default: "" },
    /** When the developer answer was last edited, as the store reported it. */
    respondedAt: { type: Date, default: null },
  },
  { _id: false },
);

const StoreReviewSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, enum: ["ios", "android"] },
    /**
     * The store's own id for the review. Apple's RSS feed and the App Store
     * Connect API agree on it, so switching from the credential-free feed to
     * the API later updates the same documents instead of doubling them.
     */
    reviewId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    /** Nickname, never an email or an account id. Reviews are public text. */
    author: { type: String, default: "" },
    /** Storefront the review was written in: `nl`, `be`, `us`, or ASC's `NLD`. */
    territory: { type: String, default: null },
    /** BCP-47-ish language tag when the store gives one (Play does, Apple does not). */
    locale: { type: String, default: null },
    appVersion: { type: String, default: null },
    submittedAt: { type: Date, required: true },
    /**
     * When the reviewer last edited the review, per the store - NOT a mongoose
     * timestamp. That is why `timestamps` below only manages `createdAt`:
     * letting mongoose own `updatedAt` too would silently overwrite the store's
     * value with "the last time our cron touched this row", which is what
     * `lastImportedAt` is for.
     */
    updatedAt: { type: Date, default: null },
    lastImportedAt: { type: Date, default: null },
    developerResponse: { type: DeveloperResponseSchema, default: null },

    /** Moderation, ours. Set by hand; never touched by an import. */
    hidden: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/**
 * The key a re-import upserts against. Unique, so a second run of the cron -
 * or a manual call, or an overlapping retry - updates the row rather than
 * appending a duplicate of the same review.
 */
StoreReviewSchema.index({ platform: 1, reviewId: 1 }, { unique: true });

/** The public list query: visible reviews, newest (or featured) first. */
StoreReviewSchema.index({ hidden: 1, rating: -1, submittedAt: -1 });

export default mongoose.models.StoreReview ||
  mongoose.model("StoreReview", StoreReviewSchema);
