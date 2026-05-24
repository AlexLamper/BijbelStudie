import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for OAuth users
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    bio: { type: String },
    image: { type: String },
    streak: { type: Number, default: 0 },
    lastStreakDate: { type: Date },
    freezeCount: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    subscribed: { type: Boolean, default: false },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    isAdmin: { type: Boolean, default: false },
    preferences: {
      language: { type: String },
      translation: { type: String, default: "statenvertaling" },
      commentary: { type: String, default: "matthew_henry_nl" },
      intent: { type: String },
      onboardingCompleted: { type: Boolean, default: false },
      fontSize: { type: String, default: "base" },
      fontFamily: { type: String, default: "sans" },
      lineHeight: { type: String, default: "relaxed" },
      letterSpacing: { type: String, default: "normal" },
      highContrast: { type: Boolean, default: false },
      showVerseNumbers: { type: Boolean, default: true },
      updatedAt: { type: Date },
    },
    lastReadChapter: {
      book: { type: String },
      chapter: { type: Number },
      version: { type: String },
      commentary: { type: String },
      updatedAt: { type: Date }
    },
    readChapters: { type: Map, of: [Number], default: {} },
  },
  { timestamps: true },
)

export default mongoose.models.User || mongoose.model("User", UserSchema)
