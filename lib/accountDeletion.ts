import mongoose from 'mongoose';
import { archiveAccount, isProtectedAccount, type ArchiveMeta, type ArchiveResult } from './accountArchive';
import { deleteAccountData } from './accountPurge';

/**
 * The one way an account is deleted. Called by all three delete paths: the
 * app's self-service delete (app/api/v1/account), the website's self-service
 * delete (app/api/user/account) and the admin delete (lib/adminUsers.ts).
 *
 * Order is the whole point, and it is fixed here so no caller can get it wrong:
 *
 * 1. Refuse a protected (admin) account - `isAdmin` or ADMIN_EMAILS. Callers
 *    check this first to return a friendly message; this is the backstop.
 * 2. `archiveAccount()` copies everything into `deletedaccounts`. If it throws,
 *    the error propagates and nothing is deleted.
 * 3. `deleteAccountData()` removes the data (lib/accountPurge.ts owns the list).
 */

export class ProtectedAccountError extends Error {
  readonly status = 403;
  constructor() {
    super('Beheerdersaccounts kunnen niet worden verwijderd.');
    this.name = 'ProtectedAccountError';
  }
}

export async function archiveAndDeleteAccount(
  account: { _id: string | mongoose.Types.ObjectId; email?: string | null; isAdmin?: boolean | null },
  meta: ArchiveMeta,
): Promise<ArchiveResult> {
  if (isProtectedAccount(account)) throw new ProtectedAccountError();

  const id = typeof account._id === 'string' ? new mongoose.Types.ObjectId(account._id) : account._id;

  // Copy first. A throw here aborts the delete - do not catch it.
  const archive = await archiveAccount(id, meta);

  await deleteAccountData(id);
  return archive;
}

/**
 * Whether a Stripe subscription would keep billing after the account is gone.
 *
 * lib/accountPurge.ts severs the Stripe linkage without cancelling anything, so
 * the website refuses to delete while one of these is live. A subscription that
 * is already set to end at the period end no longer bills, so it does not block.
 */
const BILLING_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

export function hasBillingStripeSubscription(user: {
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}): boolean {
  return Boolean(user.subscriptionStatus && BILLING_STATUSES.has(user.subscriptionStatus) && !user.cancelAtPeriodEnd);
}

/** The typed confirmation: the account's own address, ignoring case and outer spaces. */
export function emailConfirmationMatches(typed: unknown, accountEmail: string | null | undefined): boolean {
  if (typeof typed !== 'string' || !accountEmail) return false;
  const a = typed.trim().toLowerCase();
  return a.length > 0 && a === accountEmail.trim().toLowerCase();
}
