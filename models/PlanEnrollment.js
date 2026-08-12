import mongoose from 'mongoose';

/**
 * One document per (user, plan). Progress used to live inside the plan itself
 * (`BiblePlan.progress[]`), which meant a single popular plan carried every
 * enrolled user's history in one unindexed array. Splitting it out keeps a
 * user's progress bounded by their own activity and lets the common query
 * ("which plans is this user doing?") hit an index.
 *
 * `BiblePlan` is now the template only: title, duration, readings.
 */
const dayEntrySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    // The distinction the whole feature rests on: reading a passage and
    // studying it are not the same act and must not score the same.
    mode: { type: String, enum: ['read', 'studied'], default: 'read' },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const planEnrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiblePlan', required: true },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },

    /**
     * How many chapters a day the user signed up for, kept as a label rather
     * than a number so the day cards can say "rustig" instead of "1".
     * Depth is a separate axis entirely — see `days[].mode`.
     */
    pace: { type: String, enum: ['rustig', 'gestaag', 'stevig'], default: 'gestaag' },

    days: { type: [dayEntrySchema], default: [] },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'planenrollments' },
);

// The query behind "my plans", the dashboard card and the free-tier cap.
planEnrollmentSchema.index({ userId: 1, status: 1 });
// One enrollment per user per plan; re-enrolling reuses the document.
planEnrollmentSchema.index({ userId: 1, planId: 1 }, { unique: true });

const PlanEnrollment =
  mongoose.models.PlanEnrollment || mongoose.model('PlanEnrollment', planEnrollmentSchema);

export default PlanEnrollment;
