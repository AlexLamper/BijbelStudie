import mongoose from "mongoose";

const ReadingSessionSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } },
  { timestamps: true }
);

ReadingSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ReadingSession ||
  mongoose.model("ReadingSession", ReadingSessionSchema);
