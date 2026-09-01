import mongoose from 'mongoose';

/**
 * The "studied" signal.
 *
 * Until now nothing distinguished opening a chapter from working through a
 * lesson about it: `/studie` kept completion in localStorage and the server saw
 * the same `lastReadChapter` write either way. This collection is the record
 * that a passage was actually studied, which is what the streak, the XP curve
 * and the plan day cards are scored on.
 *
 * A row is a completed unit of study - one lesson of a curated study, or one
 * day of a reading plan finished in study mode.
 */
const studyProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Where the study came from. `los` is a passage the user studied on their
    // own from /studie without a plan or curated study behind it.
    source: { type: String, enum: ['curated', 'plan', 'los'], required: true },

    // Set when source === 'curated'. Curated studies are static content in
    // lib/data/curated-studies.ts, so this is their string id, not an ObjectId.
    studyId: { type: String, default: null },
    lessonDay: { type: Number, default: null },

    // Set when source === 'plan'.
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiblePlan', default: null },
    planDay: { type: Number, default: null },

    book: { type: String, required: true },
    chapter: { type: Number, required: true },
    verseStart: { type: Number, default: null },
    verseEnd: { type: Number, default: null },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'studyprogress' },
);

// "How much has this user studied, most recent first" - the profile and the
// weekly strip both read it this way.
studyProgressSchema.index({ userId: 1, completedAt: -1 });
// Re-completing the same lesson must not double-count XP.
studyProgressSchema.index(
  { userId: 1, studyId: 1, lessonDay: 1 },
  { unique: true, partialFilterExpression: { studyId: { $type: 'string' } } },
);

const StudyProgress =
  mongoose.models.StudyProgress || mongoose.model('StudyProgress', studyProgressSchema);

export default StudyProgress;
