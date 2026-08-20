import mongoose from "mongoose";

// Cached first-turn answers. Bible questions repeat heavily across users, and a
// cache hit costs no Gemini quota at all, which is what actually limits how
// many people the free tier can serve per day.
const AiAnswerSchema = new mongoose.Schema(
  {
    // sha256 of prompt version + reading context + normalised question.
    key: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true },
    book: { type: String, default: null },
    chapter: { type: Number, default: null },
    version: { type: String, default: null },
    reply: { type: String, required: true },
    model: { type: String, default: null },
    hits: { type: Number, default: 0 },
    lastHitAt: { type: Date, default: null },
    // Entries expire so answers are eventually regenerated with newer models.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export default mongoose.models.AiAnswer || mongoose.model("AiAnswer", AiAnswerSchema);
