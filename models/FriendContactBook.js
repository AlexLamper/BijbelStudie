import mongoose from "mongoose";

/**
 * One reader's address book, as peppered hashes only, kept so that reader can
 * hear about it when one of their contacts joins BijbelStudie later
 * ("<Naam> uit je contacten zit nu op BijbelStudie").
 *
 * What is in here, and what is not:
 * - `hashes` are HMAC-SHA256(FRIENDS_CONTACT_PEPPER, normalised phone or
 *   e-mail), truncated to 32 hex - exactly what the app already uploads to
 *   `POST /friends/discovery/match`. Never a number, an address or a name: the
 *   names in an address book never leave the phone at all.
 * - Linked to the uploader (`userId`), never to the people the hashes belong
 *   to. Nothing here says who those people are until one of them makes
 *   themselves findable, and then only the uploader is told, and only that a
 *   findable account matches.
 *
 * Written only when the app asked for it (`retain: true` on the match call,
 * which builds that show the matching disclosure send) and the reader has not
 * switched contact alerts off (`FriendProfile.contactJoinAlerts`). Switching
 * that off, "contacten vergeten", and account deletion all delete the
 * document; `refreshedAt` lets the daily retention job drop a book nobody has
 * refreshed for a long time (lib/dataRetention.ts).
 *
 * Its own collection rather than an array on FriendProfile: the multikey index
 * on up to a few thousand hashes per reader belongs on a document nothing else
 * reads, so the kring's own queries never pay for it.
 */
const FriendContactBookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /** Peppered contact hashes (phone and e-mail together), 32 hex each. */
    hashes: { type: [String], default: [] },

    /** sha256 over the sorted hashes, so an unchanged book is not rewritten. */
    digest: { type: String, default: null },

    /** Last time the app sent this book. Drives retention. */
    refreshedAt: { type: Date, default: null },

    /**
     * Contacts who became findable and have not been announced yet, oldest
     * first. Flushed into one grouped alert at most once a day.
     */
    pending: {
      type: [
        {
          _id: false,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          at: Date,
        },
      ],
      default: [],
    },

    /**
     * The alerts already sent, newest last and capped, so
     * `GET /notifications/social` can hand them to Android (which has no push)
     * and to an iPhone that missed the push.
     */
    alerts: {
      type: [
        {
          _id: false,
          id: String,
          at: Date,
          userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
      default: [],
    },

    /** When the last alert went out: at most one a day. */
    lastAlertAt: { type: Date, default: null },

    /** Everyone ever announced to this reader, so nobody is announced twice. */
    announced: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

// "Who has this person in their contacts?" - one query when someone becomes
// findable.
FriendContactBookSchema.index({ hashes: 1 });
// The retention sweep.
FriendContactBookSchema.index({ refreshedAt: 1 });

export default mongoose.models.FriendContactBook ||
  mongoose.model("FriendContactBook", FriendContactBookSchema);
