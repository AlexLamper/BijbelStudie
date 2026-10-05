import mongoose from "mongoose";

/**
 * One push-capable device, not one user.
 *
 * A reader has a phone and sometimes an iPad, and the same phone can be handed
 * on, sold or reset. So the token is the identity here and the user is an
 * attribute of it: registering a token that is already on file moves it to the
 * caller instead of writing a second row, which is why `token` is the unique
 * key and `userId` is only indexed. Without that, the previous owner of a
 * second-hand phone keeps receiving somebody else's vriendenkring.
 *
 * `environment` is stored rather than assumed. An APNs token minted by a
 * development build is valid **only** against api.sandbox.push.apple.com and a
 * TestFlight/App Store token only against api.push.apple.com; sending one to
 * the wrong host returns `BadDeviceToken`, which looks exactly like a dead
 * device and would have the sender delete a perfectly good token. The app
 * reports which environment it was built for and the sender filters on it.
 *
 * `platform` is `ios` for every row today. The owner rejected Firebase, so
 * Android gets no push at all - it polls `GET /api/v1/notifications/social` on
 * foreground and raises a local notification itself. The field exists so that
 * decision can be revisited without a migration, not because anything writes
 * `android` now.
 *
 * `failureCount` is the rot guard. A token that keeps failing for a reason
 * that is not conclusive (a 5xx, a timeout, a 429) is counted rather than
 * deleted, and only deleted once it has failed often enough to be certainly
 * gone. The conclusive answers - 410, `Unregistered`, `BadDeviceToken` - delete
 * on the spot (lib/push/send.ts).
 */
const DeviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /** The APNs device token, lowercase hex. Unique across all users. */
    token: { type: String, required: true, unique: true },

    /** ios today. android is reserved; see the note above. */
    platform: { type: String, enum: ["ios", "android"], default: "ios", required: true },

    /** The app's bundle id, kept so a second app could never share a row. */
    bundleId: { type: String },

    /** sandbox | production - which APNs host this token is valid against. */
    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "production",
      required: true,
    },

    /** Refreshed on every register call, so a dormant device can be aged out. */
    lastSeenAt: { type: Date, default: Date.now },

    /** Inconclusive failures in a row. Reset to 0 on a successful send. */
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// The fan-out: every live iOS device of one reader, for one environment.
DeviceTokenSchema.index({ userId: 1, platform: 1, environment: 1 });

export default mongoose.models.DeviceToken ||
  mongoose.model("DeviceToken", DeviceTokenSchema);
