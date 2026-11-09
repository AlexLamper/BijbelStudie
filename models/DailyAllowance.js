import mongoose from "mongoose";

/**
 * One account's use of a tiny daily allowance (lib/entitlements.ts TINY_*),
 * per Amsterdam calendar day and feature. Only accounts whose personal limit
 * is study material or audio ever get a row; everyone else is never counted.
 *
 * `keys` is WHAT was opened - a chapter ("genesis:1"), a music track, a
 * reading - so opening the same thing twice in a day is free, and the cap is
 * on distinct things. Written only by lib/reverseTrial.ts `claimAllowance`.
 * Rows expire by themselves a few days later; nothing reads yesterday's.
 */
const DailyAllowanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true }, // Amsterdam "YYYY-MM-DD"
    feature: { type: String, enum: ["study", "audio", "studies"], required: true },
    keys: { type: [String], default: [] },
    // Characters of natural-voice reading spent today (TINY_TTS_DAILY_CHARS).
    chars: { type: Number, default: 0 },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

DailyAllowanceSchema.index({ userId: 1, day: 1, feature: 1 }, { unique: true });
DailyAllowanceSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.DailyAllowance || mongoose.model("DailyAllowance", DailyAllowanceSchema);
