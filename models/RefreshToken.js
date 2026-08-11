import mongoose from "mongoose";

/**
 * Opaque refresh tokens for the mobile apps.
 *
 * The raw token is never stored — only its SHA-256 hash. A `family` groups
 * every token descended from one login, so a replayed (already-rotated) token
 * can revoke the whole chain instead of just itself. See lib/mobileTokens.ts.
 */
const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** SHA-256 of the raw token, hex. Unique so a hash can only exist once. */
    tokenHash: { type: String, required: true, unique: true },
    /** Rotation family. Every rotation keeps the family of its parent. */
    family: { type: String, required: true, index: true },
    platform: { type: String, enum: ["ios", "android", "web", "unknown"], default: "unknown" },
    deviceName: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    /** Set when this token was rotated, for auditing a replay. */
    replacedByHash: { type: String, default: null },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

// Mongo drops the document once it is 30 days past expiry. Keeping revoked
// tokens around a while is what makes replay detection possible.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);
