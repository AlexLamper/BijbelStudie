import mongoose from 'mongoose';

/**
 * Working state for one lesson: which steps are done, the reflection draft, and
 * the quiz result.
 *
 * Kept out of StudyEnrollment on purpose. A thirty-lesson study with an
 * 8000-character reflection per lesson would otherwise be one document rewritten
 * in full on every autosave, and the reminder cron would drag all that prose
 * through its scan.
 *
 * Kept out of StudyProgress on purpose too: that collection is the completion
 * ledger, and lib/gamification.ts counts its rows for badges and profile stats.
 * Nothing that is not a finished lesson may ever be written there.
 */
const studyLessonStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studyId: { type: String, required: true },
    lessonDay: { type: Number, required: true },

    // Step KEYS from lib/studyFlow.ts (`intro`, `word`, ...), never indices, so
    // inserting a sixth step later cannot reinterpret stored rows. Semantically
    // a Set; an array so it stays queryable.
    stepsCompleted: { type: [String], default: [] },
    currentStep: { type: String, default: 'intro' },

    // What the reader last had ON SCREEN in this lesson, as opposed to what the
    // study is configured to use.
    //
    // `viewTranslation` is deliberately NOT StudyEnrollment.translation: someone
    // checking a verse in the NBG has not decided that this is now an NBG study,
    // and writing the setting would change every future lesson plus the
    // reminder mail. Null means "whatever the enrollment says".
    //
    // `depthPanel` is the Verdieping step's right-hand tab. Trivial on its own,
    // but the step remounts on every navigation, so without it a reader who
    // opened the grondtekst and stepped back to the passage lands on the photos
    // again.
    viewTranslation: { type: String, default: null },
    depthPanel: { type: String, default: null },

    // Step 4. The DRAFT lives here, not in the Note collection - otherwise every
    // abandoned half-sentence shows up at /notities. Promoted to a real Note on
    // lesson completion, at which point `noteId` points at it.
    reflection: {
      text: { type: String, default: '', maxlength: 8000 },
      updatedAt: { type: Date, default: null },
      noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },
    },

    // Step 5, mirrored from bijbelquiz so a past result renders without a second
    // cross-origin round trip - and still renders when that server is down.
    quiz: {
      quizIds: { type: [String], default: [] },
      // "<quizId>:<questionSubdocId>" pairs, so a resumed lesson gets the same
      // questions back rather than a fresh random set.
      questionIds: { type: [String], default: [] },
      // Which option was picked per question, so half a quiz survives stepping
      // back to the passage - and so a graded lesson reopens showing the result
      // instead of an empty form the reader would answer a second time.
      answers: {
        type: [
          {
            _id: false,
            questionId: { type: String, required: true },
            answerId: { type: String, required: true },
          },
        ],
        default: [],
      },
      score: { type: Number, default: null },
      total: { type: Number, default: null },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
    },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'studylessonstate' },
);

studyLessonStateSchema.index({ userId: 1, studyId: 1, lessonDay: 1 }, { unique: true });
studyLessonStateSchema.index({ userId: 1, updatedAt: -1 });

const StudyLessonState =
  mongoose.models.StudyLessonState || mongoose.model('StudyLessonState', studyLessonStateSchema);

export default StudyLessonState;
