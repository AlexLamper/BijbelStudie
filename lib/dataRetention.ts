import DeletedAccount from '../models/DeletedAccount';
import Feedback from '../models/Feedback';
import { isProtectedAccount } from './accountArchive';

/**
 * The retention periods the privacy policy (/privacybeleid) and
 * /account-verwijderen promise, enforced. Run daily by the Vercel Cron route
 * app/api/internal/data-retention. Change a number here and the two pages must
 * change with it.
 *
 * Periods MongoDB already enforces with TTL indexes are not repeated here:
 * AnalyticsEvent (400 days), AiAnswer (365 days), SyncTombstone (180 days) and
 * RefreshToken (30 days past expiry).
 */

const DAY_MS = 86_400_000;

/** `deletedaccounts` rows are removed once they are this old. */
export const DELETED_ACCOUNT_RETENTION_DAYS = 90;

/**
 * Below this the archive stops being a safety net: recovery requests arrive
 * weeks after the deletion. Same floor as scripts/purge-deleted-accounts.mjs.
 */
export const MIN_DELETED_ACCOUNT_RETENTION_DAYS = 30;

/** Feedback (including AI-answer reports) loses every link to a person after this. */
export const FEEDBACK_IDENTITY_RETENTION_DAYS = 730;

export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

type ArchiveRow = {
  _id: unknown;
  userId?: unknown;
  email?: string | null;
  user?: { email?: string | null; isAdmin?: boolean | null } | null;
};

export type DeletedAccountPurgeResult = {
  cutoff: string;
  expired: number;
  purged: number;
  /** Admin accounts (isAdmin or ADMIN_EMAILS): the owner's own copies, never auto-purged. */
  keptProtected: number;
  purgedUserIds: string[];
};

/**
 * Deletes archive rows older than the retention period. The automated
 * counterpart of `scripts/purge-deleted-accounts.mjs --write`, with the same
 * rules: rows younger than the cutoff are never touched, and neither is a copy
 * of an admin account.
 */
export async function purgeExpiredDeletedAccounts({
  now = new Date(),
  days = DELETED_ACCOUNT_RETENTION_DAYS,
}: { now?: Date; days?: number } = {}): Promise<DeletedAccountPurgeResult> {
  if (!Number.isFinite(days) || days < MIN_DELETED_ACCOUNT_RETENTION_DAYS) {
    throw new Error(
      `Refusing to purge deletedaccounts with a retention of ${days} days (minimum ${MIN_DELETED_ACCOUNT_RETENTION_DAYS}).`,
    );
  }
  const cutoff = retentionCutoff(now, days);

  // Only the fields the admin check needs - never the archived documents.
  const rows = await DeletedAccount.find({ deletedAt: { $lt: cutoff } })
    .select({ _id: 1, userId: 1, email: 1, 'user.email': 1, 'user.isAdmin': 1 })
    .lean<ArchiveRow[]>();

  const remove = rows.filter(
    (row) => !isProtectedAccount({ email: row.user?.email ?? row.email, isAdmin: row.user?.isAdmin }),
  );

  let purged = 0;
  if (remove.length > 0) {
    const result = await DeletedAccount.deleteMany({
      _id: { $in: remove.map((row) => row._id) },
      // Repeated so a row can never be removed early, whatever the list holds.
      deletedAt: { $lt: cutoff },
    });
    purged = result.deletedCount ?? 0;
  }

  return {
    cutoff: cutoff.toISOString(),
    expired: rows.length,
    purged,
    keptProtected: rows.length - remove.length,
    purgedUserIds: remove.map((row) => String(row.userId)),
  };
}

/**
 * `$set` that removes who gave a feedback document: account, name, e-mail,
 * self-reported contact details and user agent. Shared by account deletion
 * (lib/accountPurge.ts) and the 2-year job below, so both anonymise the same
 * fields.
 */
export function feedbackIdentityClear(now: Date) {
  return {
    userId: null,
    name: '',
    email: '',
    contactName: '',
    contactEmail: '',
    userAgent: '',
    anonymisedAt: now,
  };
}

/**
 * `$set` for `touchpoint: "ai_report"` documents (lib/aiReport.ts): the
 * reader's own free text - their question and comment, which `message` repeats -
 * can name them, so it goes. The reason, the AI answer, surface and model stay:
 * they are what the report is about. Apply BEFORE feedbackIdentityClear, which
 * nulls the `userId` this is filtered on.
 */
export const AI_REPORT_FREE_TEXT_CLEAR = {
  message: 'AI-antwoord gemeld',
  'aiReport.comment': '',
  'aiReport.question': '',
} as const;

/**
 * `$unset` for replies sent to the person (lib/feedbackReply.ts): a reply can
 * address them by name and its Resend id leads back to their address. Shared by
 * account deletion and the 2-year job.
 */
export const FEEDBACK_REPLY_UNSET = { replies: '', lastReplyAt: '', userSeenReplyAt: '' } as const;

export type FeedbackAnonymiseResult = { cutoff: string; aiReportsCleared: number; anonymised: number };

/**
 * Cuts the link between feedback older than the retention period and the
 * person who gave it. Account deletion does the same immediately
 * (lib/accountPurge.ts); this covers everyone who keeps their account. Other
 * free text (`message`, `answers`) stays: it is about the product, and the
 * policy says so.
 */
export async function anonymiseExpiredFeedback({
  now = new Date(),
  days = FEEDBACK_IDENTITY_RETENTION_DAYS,
}: { now?: Date; days?: number } = {}): Promise<FeedbackAnonymiseResult> {
  const cutoff = retentionCutoff(now, days);
  const expired = { createdAt: { $lt: cutoff }, anonymisedAt: null };
  const reports = await Feedback.updateMany(
    { ...expired, touchpoint: 'ai_report' },
    { $set: AI_REPORT_FREE_TEXT_CLEAR },
  );
  const result = await Feedback.updateMany(expired, {
    $set: feedbackIdentityClear(now),
    $unset: FEEDBACK_REPLY_UNSET,
  });
  return {
    cutoff: cutoff.toISOString(),
    aiReportsCleared: reports.modifiedCount ?? 0,
    anonymised: result.modifiedCount ?? 0,
  };
}
