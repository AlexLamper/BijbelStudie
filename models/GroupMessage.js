import mongoose from "mongoose"

const ReactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji:  { type: String, required: true },
  },
  { _id: false }
)

const GroupMessageSchema = new mongoose.Schema(
  {
    groupId:  { type: mongoose.Schema.Types.ObjectId, ref: "StudyGroup", required: true },
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",       required: true },
    type:     { type: String, enum: ["bericht", "gebedsverzoek", "aankondiging"], default: "bericht" },
    content:  { type: String, required: true, maxlength: 2000 },
    verseRef: {
      book:    { type: String },
      chapter: { type: Number },
      verse:   { type: Number },
      _id: false,
    },
    reactions: { type: [ReactionSchema], default: [] },
    parentId:  { type: mongoose.Schema.Types.ObjectId, ref: "GroupMessage", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

GroupMessageSchema.index({ groupId: 1, createdAt: -1 })
GroupMessageSchema.index({ groupId: 1, parentId: 1 })

export default mongoose.models.GroupMessage ||
  mongoose.model("GroupMessage", GroupMessageSchema)
