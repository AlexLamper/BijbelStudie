import mongoose from "mongoose";

/**
 * Idempotency ledger for provider webhooks. RevenueCat retries deliveries, so
 * the same event id can arrive several times; inserting it here first and
 * letting the unique index reject duplicates is what makes handling exactly-once.
 */
const WebhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, enum: ["revenuecat", "stripe"] },
    eventId: { type: String, required: true },
    payloadSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export default mongoose.models.WebhookEvent ||
  mongoose.model("WebhookEvent", WebhookEventSchema);
