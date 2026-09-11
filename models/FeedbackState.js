import mongoose from "mongoose";

/**
 * What this reader has already been asked. One document per user.
 *
 * The thing worth designing against is not "too little feedback", it is "the
 * prompts became the thing people complain about". So every ask is spent out of
 * a budget: one prompt a month, four a year, nothing within fourteen days of
 * the last one, the same question at most quarterly and at most twice ever.
 * This document is that budget, and `lib/feedbackEligibility.ts` is the only
 * thing that reads it.
 *
 * Shaped like models/AiUsage.js: one read and one write per decision, with the
 * period counters keyed by a string ("2026-09", "2026") so a new month resets
 * by comparison instead of by a cron job.
 *
 * `optedOut` is permanent and honoured forever. A reader who says "stop asking"
 * and is asked again has been told the switch does nothing.
 */
const PromptStateSchema = new mongoose.Schema(
  {
    /** A key of PROMPTS in lib/feedbackPrompts.ts. */
    promptId: { type: String, required: true },
    shownCount: { type: Number, default: 0 },
    lastShownAt: { type: Date, default: null },
    answeredAt: { type: Date, default: null },
    skippedCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const FeedbackStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    /** The global cooldown anchor: the last time ANY budgeted prompt was shown. */
    lastPromptAt: { type: Date, default: null },
    promptsThisMonth: { type: Number, default: 0 },
    /** "2026-09". A mismatch means the month counter is stale, not zero. */
    monthKey: { type: String, default: null },
    promptsThisYear: { type: Number, default: 0 },
    yearKey: { type: String, default: null },
    /** One-tap micro-signals, which have their own lifetime cap of 25. */
    microSignalCount: { type: Number, default: 0 },
    optedOut: { type: Boolean, default: false },
    prompts: { type: [PromptStateSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.FeedbackState ||
  mongoose.model("FeedbackState", FeedbackStateSchema);
