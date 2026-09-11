import mongoose from "mongoose";

/**
 * A copy of every account the app deletes, written BEFORE the delete runs.
 *
 * On 2026-09-08 the owner's production User document disappeared and was
 * silently re-created empty at the next sign-in. Everything that made the
 * account theirs - readChapters, streak, XP, badges, the studio choice - lived
 * only in that one document, and nothing kept a copy. This collection is the
 * copy. Both delete paths (lib/adminUsers.ts and app/api/v1/account) call
 * lib/accountArchive.ts first and refuse to delete when archiving fails.
 *
 * Restore with `node scripts/recover-account.mjs`. Rows are kept for 90 days
 * (the retention the privacy policy promises) and removed by
 * `node scripts/purge-deleted-accounts.mjs`, which is read-only unless
 * --write. There is deliberately no TTL index: MongoDB would drop these
 * copies unattended, and an archive row is the only thing standing between a
 * wrong deletion and permanent data loss.
 */
const DeletedAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, index: true },
    /** Which code path deleted it: "admin" or "v1/account". */
    route: { type: String, required: true },
    /** The email of whoever asked for the deletion. */
    actor: { type: String, default: null },
    reason: { type: String, default: null },
    /** The full User document, exactly as stored. */
    user: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Related documents by collection name (notes, readinghistories, ...). */
    related: { type: mongoose.Schema.Types.Mixed, default: {} },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Collections that hit the per-collection cap and were cut short. */
    truncated: { type: [String], default: [] },
    deletedAt: { type: Date, default: Date.now, index: true },
  },
  { minimize: false }
);

export default mongoose.models.DeletedAccount ||
  mongoose.model("DeletedAccount", DeletedAccountSchema);
