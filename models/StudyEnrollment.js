import mongoose from 'mongoose';

/**
 * One user's participation in one curated study: their settings, and where they
 * left off.
 *
 * This is the model that fixes the bug the guided flow was built for. Until now
 * the active study lived in `sessionStorage`, so closing the tab threw away
 * which lesson someone was on - only *completed* lessons ever reached the
 * server, via StudyProgress.
 *
 * The boundary between the two collections is deliberate and load-bearing:
 *
 *   StudyProgress     the ledger. Append-only, "this lesson was completed".
 *                     lib/gamification.ts COUNTS these rows for badges and the
 *                     profile, so a row for a merely *opened* lesson would
 *                     silently inflate every one of those numbers.
 *   StudyEnrollment   settings + resume cursor. Mutable, rewritten constantly.
 *   StudyLessonState  per-lesson working state. Mutable, see that file.
 */
const studyEnrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Curated studies are static content in lib/data/curated-studies.ts, so this
    // is their string id - matching StudyProgress.studyId, not an ObjectId.
    studyId: { type: String, required: true },

    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'abandoned'],
      default: 'active',
    },

    // --- Settings chosen on the study detail page ---
    rhythm: {
      type: String,
      enum: ['dagelijks', 'drie-per-week', 'wekelijks', 'eigen', 'vrij'],
      default: 'dagelijks',
    },
    // Weekdays, 0 = Sunday through 6 = Saturday. Only meaningful when
    // rhythm === 'eigen'.
    reminderDays: { type: [Number], default: [] },

    // null means "inherit from user.preferences". Storing null rather than
    // copying the value means changing the global preference still moves the
    // study, which is what someone changing a global preference expects.
    translation: { type: String, default: null },
    depth: { type: String, enum: ['kort', 'diep'], default: 'kort' },
    // Explicit override; normally derived from `depth` by lib/studyFlow.ts.
    commentary: { type: String, default: null },

    // --- Resume cursor: the single source of truth for "waar was ik" ---
    currentLessonDay: { type: Number, default: 1 },
    currentStep: {
      type: String,
      enum: ['intro', 'word', 'depth', 'reflection', 'quiz', 'done'],
      default: 'intro',
    },

    // Denormalised so /studies and the dashboard render a progress bar without
    // a second query per study.
    lessonsTotal: { type: Number, required: true },
    lessonsCompleted: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },

    // --- Reminder scheduling. See lib/studyReminders.ts ---
    remindersEnabled: { type: Boolean, default: true },
    // Minutes past local midnight. null = inherit user.preferences.reminderMinutes.
    reminderMinutes: { type: Number, default: null },
    // IANA zone. null = inherit user.preferences.reminderTimezone.
    reminderTimezone: { type: String, default: null },
    reminderChannel: {
      type: String,
      enum: ['none', 'email', 'push', 'both'],
      // Email, not push: the mobile app already schedules its reminder LOCALLY
      // on the device (see models/User.js), so a server push would be a second
      // notification for the same thing.
      default: 'email',
    },
    // Absolute UTC instant. THE key the reminder cron queries on - the timezone
    // arithmetic happens once, at write time, so the cron never has to do it.
    nextReminderAt: { type: Date, default: null },
    lastReminderSentAt: { type: Date, default: null },
    // Impossible to backfill later, and without them "reminders are broken" and
    // "nobody opens them" look identical.
    reminderSentCount: { type: Number, default: 0 },
    reminderSkipCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'studyenrollments' },
);

studyEnrollmentSchema.index({ userId: 1, studyId: 1 }, { unique: true });
studyEnrollmentSchema.index({ userId: 1, lastActivityAt: -1 });

// The reminder cron's only query. Partial, so completed, paused and opted-out
// rows are not in the index at all: the scan is proportional to who is actually
// due, not to how many people ever started a study.
studyEnrollmentSchema.index(
  { nextReminderAt: 1 },
  {
    partialFilterExpression: {
      nextReminderAt: { $type: 'date' },
      status: 'active',
      remindersEnabled: true,
    },
  },
);

const StudyEnrollment =
  mongoose.models.StudyEnrollment || mongoose.model('StudyEnrollment', studyEnrollmentSchema);

export default StudyEnrollment;
