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
    // Optional one-line summary from the /feedback form. Older documents carry
    // it (if at all) as the first line of `message`.
    subject: { type: String, default: "", maxlength: 120 },
    message: { type: String, required: true, maxlength: 4000 },
    page: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    // `planned` and `shipped` are the two states a reader sees as progress in
    // "Mijn feedback" (Gepland / Opgelost).
    status: {
      type: String,
      enum: ["new", "reviewed", "planned", "shipped", "resolved", "archived"],
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
        // A reader flagging an AI-assistant answer (`lib/aiReport.ts`).
        "ai_report",
        // Dashboard prompt on the visit after a study was finished.
        "study_complete",
        // "Wat houdt je tegen?" under an upgrade prompt.
        "paywall_dismiss",
        // One-tap thumbs (lib/feedbackSignal.ts).
        "ai_answer",
        "lesson_quality",
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

    // Only on `touchpoint: "ai_report"`: the flagged answer itself, so the
    // report can be judged (and the prompt or filter fixed) without having to
    // reproduce a model reply that may never come out the same way twice.
    // Left undefined on every other document.
    aiReport: {
      type: new mongoose.Schema(
        {
          reason: { type: String, enum: ["onjuist", "aanstootgevend", "schadelijk", "anders"], required: true },
          comment: { type: String, default: "", maxlength: 1000 },
          question: { type: String, default: "", maxlength: 2000 },
          answer: { type: String, required: true, maxlength: 4000 },
          surface: { type: String, default: "onbekend" },
          model: { type: String, default: null },
        },
        { _id: false },
      ),
      default: undefined,
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

    // Closing the loop (lib/feedbackReply.ts). An internal note is never shown
    // to the reader; a reply is, in "Mijn feedback" and by email when a sender
    // is configured. `lastReplyAt` against `userSeenReplyAt` is what makes a
    // reply "unseen" without scanning the array.
    adminNote: { type: String, default: "", maxlength: 2000 },
    replies: {
      type: [
        new mongoose.Schema(
          {
            at: { type: Date, required: true },
            body: { type: String, required: true, maxlength: 4000 },
            channel: { type: String, enum: ["email", "in_app"], default: "in_app" },
            emailStatus: {
              type: String,
              enum: ["sent", "skipped", "failed", "no_recipient", null],
              default: null,
            },
            emailId: { type: String, default: null },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    lastReplyAt: { type: Date, default: null },
    userSeenReplyAt: { type: Date, default: null },

    // Consent to quote this answer publicly, and nothing more.
    //
    // Without `mayPublish: true` no word of a submission may appear on the
    // site: the default is false, the checkbox is unticked, and it is only ever
    // offered on a 4 or 5 rating that carries an actual note (validated
    // server-side in `resolvePublishConsent`, never trusted from the body).
    //
    // `displayName` is what the reader CHOSE to be credited as. It is never
    // auto-filled from `name` or from the account: a reader who agrees to be
    // quoted has not agreed to be named, so an empty string means "no name".
    // `publishedAt` is set by hand in /beheer/feedback; nothing publishes
    // itself, and clearing it takes the quote down again.
    mayPublish: { type: Boolean, default: false, index: true },
    displayName: { type: String, default: "", maxlength: 60 },
    publishedAt: { type: Date, default: null },

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
// "Mijn feedback" and the dashboard's unseen-reply check.
FeedbackSchema.index({ userId: 1, createdAt: -1 })
// The published testimonials, newest first. Sparse-ish by nature: almost every
// document has `publishedAt: null`.
FeedbackSchema.index({ publishedAt: -1 })

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema)
