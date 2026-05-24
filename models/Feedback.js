import mongoose from "mongoose"

const FeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    category: {
      type: String,
      enum: ["bug", "feature", "praise", "other"],
      default: "other",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, required: true, maxlength: 4000 },
    page: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved", "archived"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
)

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema)
