import mongoose from "mongoose";

/**
 * Everything per-account that Vriendenkring needs, in its own collection
 * rather than as fields on `User`.
 *
 * That is deliberate: `User` is the document the 2026-09-08 incident was
 * about, its progress fields may only be touched with targeted operators, and
 * a hydrated `User` must never be `save()`d. Keeping the kring's settings here
 * means nothing in this feature can reach a progress field by accident.
 *
 * `phoneHashes` / `emailHashes` hold the owner's OWN identifiers, hashed, and
 * only when they chose to be findable. Hashes uploaded by someone else while
 * matching their address book are never stored anywhere (VRIENDENKRING_PLAN.md
 * §6).
 */
const FriendProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /** May others find me by a contact hash? Off until explicitly set. */
    discoverable: { type: Boolean, default: false },

    /** HMAC-SHA256(pepper, normalised value), hex, truncated to 32 chars. */
    phoneHashes: { type: [String], default: [] },
    emailHashes: { type: [String], default: [] },

    /** Last time the owner opened Vriendenkring; drives newActivityCount. */
    feedSeenAt: { type: Date },

    /**
     * How far `GET /api/v1/notifications/social` has handed events to a
     * client. Deliberately not `feedSeenAt`: that one means "the reader
     * looked", this one means "a client was told". Sharing one field would
     * make opening the kring silence notifications nobody saw, and a
     * background poll clear the feed badge. Only a fallback for a client with
     * no cursor of its own, and only ever advanced with `$max`.
     */
    socialSeenAt: { type: Date },

    /**
     * Which categories post to the kring on their own. Milestones are the only
     * one on by default; a note or a verse is shared by hand (plan §8).
     */
    autoShare: {
      milestones: { type: Boolean, default: true },
      verses: { type: Boolean, default: false },
      notes: { type: Boolean, default: false },
    },

    blocked: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

// Multikey, for the contact match: one query per hash batch.
FriendProfileSchema.index({ phoneHashes: 1 });
FriendProfileSchema.index({ emailHashes: 1 });

export default mongoose.models.FriendProfile ||
  mongoose.model("FriendProfile", FriendProfileSchema);
