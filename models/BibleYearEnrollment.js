import mongoose from 'mongoose';

/**
 * One reader's run through "Bijbel in een jaar" (DAILY_HABIT_PLAN.md §4,
 * lib/bibleYear/*). The schedule itself is static content, fully determined by
 * (planKey, track, scheduleVersion), so the document stores only the choices
 * and what has been read.
 *
 * Write rules (lib/bibleYear/service.ts is the only writer):
 *   readRefs   `$addToSet` / `$pull` only - never assigned wholesale.
 *   paidDays   `$addToSet` behind a `{paidDays: {$ne: day}}` filter, so the
 *              `plan_day_read` XP for a day is paid exactly once. Never pulled:
 *              un-ticking a chapter does not take XP back.
 *   shiftDays  `$inc` ("Schema verschuiven").
 *   status     active -> completed | abandoned. "Opnieuw beginnen" abandons the
 *              running document and creates a new one; nothing is deleted
 *              except by the account purge (lib/accountPurge.ts).
 */
const bibleYearEnrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    planKey: { type: String, enum: ['jaar-1', 'jaar-2'], required: true },
    track: { type: String, enum: ['gemengd', 'canoniek'], required: true },
    // Frozen at start: a later schedule version never moves a running plan.
    scheduleVersion: { type: Number, required: true },

    // 'YYYY-MM-DD', a calendar date in `timeZone` - not an instant, so DST and
    // travel never move "day 1".
    startDate: { type: String, required: true },
    timeZone: { type: String, default: 'Europe/Amsterdam' },
    shiftDays: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },

    // "CODE.chapter" keys ("GEN.1"), codes from lib/readChaptersCanon.ts.
    readRefs: { type: [String], default: [] },
    // Schedule days (1-based) whose plan_day_read XP has been paid.
    paidDays: { type: [Number], default: [] },

    completedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'bibleyearenrollments' },
);

// Every read: the active plan (or the latest completed one) of one user, and
// the completed count behind the badges in lib/gamification.ts.
bibleYearEnrollmentSchema.index({ userId: 1, status: 1 });

// At most one running plan per user. Partial, so any number of completed and
// abandoned runs can sit beside it.
bibleYearEnrollmentSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'userId_active_unique' },
);

const BibleYearEnrollment =
  mongoose.models.BibleYearEnrollment || mongoose.model('BibleYearEnrollment', bibleYearEnrollmentSchema);

export default BibleYearEnrollment;
