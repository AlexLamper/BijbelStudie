import mongoose from "mongoose";

/**
 * One document per calendar month: everything the AI has cost, for everybody.
 *
 * `AiUsage` already caps what one PERSON may ask per day. This is the other
 * half, and the half that protects the bank account: a ceiling on the whole
 * application. Per-user caps do not bound the bill, because the bill scales with
 * the number of users - a thousand free accounts at five questions each is five
 * thousand calls that no per-user limit objects to.
 *
 * Counters are integers so every write can be a single atomic `$inc`. Money is
 * stored in MICROCENTS (1/1,000,000 of a euro cent) rather than a float:
 * accumulating fractional cents in a double drifts, and a budget that drifts is
 * not a budget. At Flash-Lite prices one answer costs a few hundred microcents,
 * so an integer stays exact for any volume this app will ever see.
 */
const AiSpendSchema = new mongoose.Schema(
  {
    /** `YYYY-MM`, UTC. Unique, so the whole month is one row to increment. */
    month: { type: String, required: true, unique: true, index: true },

    /** Calls that actually reached the provider. Cache hits are not counted. */
    requests: { type: Number, default: 0 },

    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },

    /** Estimated spend this month, in microcents. See lib/aiBudget. */
    microCents: { type: Number, default: 0 },

    /**
     * Set the first time a cap is hit in a month, so the admin dashboard can
     * show "the AI switched itself off on the 14th" rather than only that it is
     * currently off.
     */
    cappedAt: { type: Date, default: null },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.models.AiSpend || mongoose.model("AiSpend", AiSpendSchema);
