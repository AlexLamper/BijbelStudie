import mongoose from "mongoose";

const TtsUsageSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, index: true },
    charsUsed: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.models.TtsUsage || mongoose.model("TtsUsage", TtsUsageSchema);
