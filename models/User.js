import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Normalised so mongoose can't reintroduce the mixed-case duplicates the
    // app-side lookups already guard against - see lib/userLookup.ts.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String }, // Optional for OAuth users
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    bio: { type: String },
    image: { type: String },
    streak: { type: Number, default: 0 },
    lastStreakDate: { type: Date },
    freezeCount: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    // Experience and level. XP is awarded by lib/gamification.ts, which weights
    // a studied passage far above a read one on purpose: the point of the app
    // is understanding a small portion, not covering a large one.
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    subscribed: { type: Boolean, default: false },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    // --- Billing state, written by the Stripe webhook (app/api/webhooks/stripe).
    // `subscribed` stays the single boolean the rest of the app gates on; these
    // record *why* it has its current value, which is what the dashboard billing
    // banner, the pause flow and the annual upsell all need.
    // Mirrors Stripe's subscription.status verbatim so it can be compared without
    // translation.
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "unpaid", "paused", "incomplete", "incomplete_expired", null],
      default: null,
    },
    subscriptionInterval: { type: String, enum: ["monthly", "annual", null], default: null },
    stripePriceId: { type: String },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    // Set when an invoice first fails, cleared on the next successful payment.
    // Involuntary churn is silent without this - the user never learns the card
    // expired until access disappears.
    billingIssueSince: { type: Date, default: null },
    // Set while the subscription is paused via `pause_collection` instead of
    // cancelled outright.
    pausedUntil: { type: Date, default: null },
    // When the current subscription first started, so the month-3 annual upsell
    // can be timed without querying Stripe on every page load.
    subscriptionStartedAt: { type: Date, default: null },
    // Free-text reason captured on the cancellation screen. Without it every
    // later retention decision is guesswork.
    cancellationReason: { type: String },
    cancellationFeedback: { type: String },
    // Suppresses the in-app annual upsell once the user has said no.
    annualUpsellDismissedAt: { type: Date, default: null },
    isAdmin: { type: Boolean, default: false },
    // --- Mobile (App Store / Play) additions. The website ignores all of
    // these; `subscribed` remains the Stripe-only flag it always was, and
    // effective Pro is the OR of the two (see lib/mobilePremium.ts).
    storePremium: { type: Boolean, default: false },
    storePremiumPlatform: { type: String, enum: ["apple", "google", null], default: null },
    storePremiumExpiresAt: { type: Date, default: null },
    // Apple's `sub` claim. Stable across sign-ins even when the user hides
    // their email behind a private-relay address.
    appleId: { type: String, index: true, sparse: true },
    googleId: { type: String, index: true, sparse: true },
    preferences: {
      language: { type: String },
      translation: { type: String, default: "statenvertaling" },
      commentary: { type: String, default: "matthew_henry_nl" },
      intent: { type: String },
      onboardingCompleted: { type: Boolean, default: false },
      tourCompleted: { type: Boolean, default: false },
      fontSize: { type: String, default: "base" },
      fontFamily: { type: String, default: "sans" },
      lineHeight: { type: String, default: "relaxed" },
      letterSpacing: { type: String, default: "normal" },
      highContrast: { type: Boolean, default: false },
      showVerseNumbers: { type: Boolean, default: true },
      ttsVoice: { type: String, default: "bram" },
      // Daily reading reminder. The notification itself is still scheduled
      // locally by the Flutter app (no push certificates, no cron); storing the
      // time here is what lets the website show and change it, and lets a new
      // device pick up the user's existing choice instead of starting blank.
      reminderEnabled: { type: Boolean, default: false },
      // Minutes past local midnight, matching the app's `app.dailyReminderMinutes`.
      reminderMinutes: { type: Number, default: 480 },
      reminderTimezone: { type: String, default: "Europe/Amsterdam" },
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

/**
 * Last line of defence for `readChapters`.
 *
 * That field is a `Map` of book name to chapter numbers, and the map key is the
 * one part of this document a request has ever been able to choose. A key that
 * is `$`-prefixed or dotted is not merely bad data: Mongoose refuses to save a
 * document containing one, so a single junk key makes EVERY later `save()` on
 * that user throw - profile edits, reading progress, and at one point the Pro
 * entitlement write as well.
 *
 * The two routes that write chapter keys validate them (lib/readingProgress
 * `isSafeBookKey`), and the billing writes have moved to targeted `updateOne`s.
 * This hook exists because neither of those helps against the other way the key
 * appears: a full-document `save()` can serialise the map's own schema path,
 * `$*`, into the update as a literal key. That is how it happened in production
 * on 2026-08-29 - a `user.save()` in the checkout route, moments before the
 * Stripe session was created.
 *
 * So rather than trusting every present and future call site to be careful, the
 * model drops structurally invalid entries on the way out. A save can no longer
 * poison the document it is saving, and a document that was already poisoned
 * heals itself the next time anything saves it.
 */
UserSchema.pre("save", function stripInvalidReadChapterKeys(next) {
  const map = this.readChapters
  if (map && typeof map.forEach === "function") {
    const invalid = []
    map.forEach((chapters, book) => {
      const keyOk =
        typeof book === "string" &&
        book.length > 0 &&
        !book.startsWith("$") &&
        !book.includes(".")
      const valueOk =
        Array.isArray(chapters) &&
        chapters.every((n) => typeof n === "number" && Number.isFinite(n))
      if (!keyOk || !valueOk) invalid.push(book)
    })

    if (invalid.length > 0) {
      for (const book of invalid) map.delete(book)
      this.markModified("readChapters")
      console.warn(
        `[user] Ongeldige readChapters-sleutels verwijderd bij het opslaan: ${invalid.join(", ")}`
      )
    }
  }
  next()
})

export default mongoose.models.User || mongoose.model("User", UserSchema)
