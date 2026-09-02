import mongoose from "mongoose"

/**
 * One feedback submission.
 *
 * Every field added beyond the original set is optional, so documents written
 * by the old unprompted form stay valid and nothing needs migrating.
 *
 * The design principle for `context`: an answer read six months from now has
 * to be interpretable without going back to the author. "Te moeilijk" is
 * useless on its own and actionable when it carries the study, the lesson day
 * and whether the reader was two days or two years into the product. Buckets
 * rather than exact figures, for the same reason `lib/analyticsSchema.ts` uses
 * them - an exact streak count is closer to identifying than it is useful.
 */
const FeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    // Resolved from the session at write time, never from the request body.
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    // Self-reported reply details on an anonymous submission. Named apart from
    // `name`/`email` on purpose: these identify nobody and the admin view must
    // not present them as if they did.
    contactName: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    category: {
      type: String,
      enum: ["bug", "feature", "praise", "other"],
      default: "other",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, required: true, maxlength: 4000 },
    page: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved", "archived"],
      default: "new",
      index: true,
    },

    // Which surface produced this. "unprompted" is the /feedback page and the
    // app sheet, which is what every pre-existing document effectively is.
    touchpoint: {
      type: String,
      enum: [
        "unprompted",
        "study_lesson_complete",
        "quiz_question_review",
        "quiz_complete",
        "study_abandoned",
        "onboarding_abandoned",
        "subscription_cancel",
        "dormant_return",
        "pmf_survey",
      ],
      default: "unprompted",
      index: true,
    },

    // Which registry entry asked. Null for unprompted feedback.
    promptId: { type: String, default: null, index: true },
    // Bumped whenever the Dutch wording changes, so answers to two different
    // questions are never averaged together.
    promptVersion: { type: Number, default: 1 },

    // Structured answers. Keys come from the registry entry; anything else is
    // dropped rather than rejected, as `sanitizeProps` does for analytics.
    answers: [{ _id: false, key: String, value: String }],

    // The state the author was in, resolved server-side at write time.
    segment: {
      type: String,
      enum: ["nieuw", "actief", "verdiepend", "afhakend", "slapend", "opgezegd", null],
      default: null,
      index: true,
    },

    context: {
      // A `lib/analyticsRoutes.ts` key, never a raw path - a path can carry a
      // book and chapter, which is more than this needs to know.
      routeKey: { type: String, default: null },
      studyId: { type: String, default: null, index: true },
      lessonDay: { type: Number, default: null },
      stepKey: { type: String, default: null },
      quizId: { type: String, default: null },
      quizQuestionId: { type: String, default: null, index: true },
      answeredCorrectly: { type: Boolean, default: null },
      planId: { type: String, default: null },
      // The only two client-supplied context values, and `platform` is
      // enum-validated on the way in.
      platform: { type: String, enum: ["web", "ios", "android", null], default: null },
      appVersion: { type: String, default: null },
      locale: { type: String, default: "nl" },
      isPro: { type: Boolean, default: null },
      streakBucket: { type: String, default: null },
      tenureBucket: { type: String, default: null },
      lessonsBucket: { type: String, default: null },
    },

    // Triage, assigned by a human in the read-out. Never inferred, because a
    // guessed theme is worse than no theme when the whole point is to find out
    // what people actually mean.
    themes: { type: [String], default: [], index: true },
    sentiment: {
      type: String,
      enum: ["negatief", "neutraal", "positief", null],
      default: null,
    },

    // Set by the retention job once `userId`, `name` and `email` have been
    // cleared. The answer itself is kept - it is about the product, not the
    // person.
    anonymisedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// The read-out's four access patterns: a touchpoint feed, everything said
// about one lesson, everything said about one quiz question, and one prompt's
// answers over time.
FeedbackSchema.index({ touchpoint: 1, createdAt: -1 })
FeedbackSchema.index({ "context.studyId": 1, "context.lessonDay": 1 })
FeedbackSchema.index({ "context.quizQuestionId": 1 })
FeedbackSchema.index({ promptId: 1, createdAt: -1 })

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema)
