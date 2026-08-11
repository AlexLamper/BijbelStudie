import mongoose from "mongoose";

const AiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true }, // UTC "YYYY-MM-DD"
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

export default mongoose.models.AiUsage || mongoose.model("AiUsage", AiUsageSchema);
