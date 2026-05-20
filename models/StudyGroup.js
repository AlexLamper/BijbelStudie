import mongoose from "mongoose"

const MemberSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role:     { type: String, enum: ["leader", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
})

const StudyGroupSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isPublic:    { type: Boolean, default: true },
    inviteCode:  { type: String, unique: true, sparse: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members:     [MemberSchema],
    planId:      { type: mongoose.Schema.Types.ObjectId, ref: "BiblePlan", default: null },
    weeklyAssignment: {
      book:    { type: String },
      chapter: { type: Number },
      title:   { type: String, default: "" },
      setBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      setAt:   { type: Date, default: Date.now },
      dueDate: { type: Date, default: null },
      _id: false,
    },
    challenge: {
      title:     { type: String },
      type:      { type: String, enum: ["chapters", "notes"] },
      target:    { type: Number },
      startDate: { type: Date },
      endDate:   { type: Date },
      _id: false,
    },
  },
  { timestamps: true }
)

// Index for fast member lookup
StudyGroupSchema.index({ "members.userId": 1 })
StudyGroupSchema.index({ inviteCode: 1 })

export default mongoose.models.StudyGroup ||
  mongoose.model("StudyGroup", StudyGroupSchema)
