import mongoose from "mongoose";

/**
 * Funnel telemetry for the monetisation work. Deliberately minimal: an event
 * name from a fixed allowlist, a small bag of low-cardinality properties, and
 * an optional user reference.
 *
 * Privacy: no IP address, no user agent, no free text from the client. The
 * `props` are validated against a schema server-side before they land here, so
 * this collection can never become an accidental PII store - which also keeps
 * it out of scope for the privacy policy beyond "we measure our own funnel".
 */
const AnalyticsEventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    // Null for logged-out visitors. We intentionally do not fingerprint them.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // Random per-tab id so a logged-out visit can be stitched into one funnel
    // without identifying the person. Never derived from IP or device.
    anonId: { type: String, default: null, index: true },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Indexed below via the compound and TTL definitions, not here - declaring
    // `index: true` as well produces a duplicate-index warning at startup.
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Funnel queries are always "events of type X in a date range".
AnalyticsEventSchema.index({ name: 1, occurredAt: -1 });

// Telemetry has no long-term value and unbounded growth is a liability.
// Mongo drops documents automatically 400 days after they are written.
AnalyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export default mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
