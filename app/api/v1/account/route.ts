import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoDB from '../../../../lib/mongodb';
import { corsPreflight, errorV1, handleV1Error, V1_CORS_HEADERS } from '../../../../lib/apiV1';
import { requireUser } from '../../../../lib/apiAuth';
import { archiveAndDeleteAccount } from '../../../../lib/accountDeletion';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * DELETE /api/v1/account   - Apple guideline 5.1.1(v).
 *
 * Body: { "confirm": "VERWIJDER" }
 *
 * This must be completable inside the app. No "mail ons" escape hatch, no link
 * to a web form: an app that supports account creation and cannot delete the
 * account in-app is rejected automatically.
 *
 * What gets removed lives in lib/accountPurge.ts, shared with the admin delete.
 */
export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireUser(req);

    const body = await req.json().catch(() => ({}));
    if ((body as { confirm?: unknown }).confirm !== 'VERWIJDER') {
      return errorV1('CONFIRMATION_REQUIRED', 400, 'Stuur { "confirm": "VERWIJDER" } mee.');
    }

    // An admin account is never deleted from the app. The owner tests the app
    // on their own account, and a preview build shares the production
    // database (docs/test-environment.md): on 2026-09-08 that account was
    // deleted and re-created empty. Remove the admin role first if you mean it.
    if (caller.isAdmin) {
      return errorV1(
        'ADMIN_ACCOUNT',
        403,
        'Een beheerdersaccount kan niet via de app worden verwijderd. Haal eerst de beheerdersrol weg.',
      );
    }

    await connectMongoDB();
    const userId = new mongoose.Types.ObjectId(caller.id);

    // Copy everything first, then delete - both inside the shared function. If
    // the copy throws, nothing is removed and the account stays;
    // lib/accountArchive.ts explains why.
    await archiveAndDeleteAccount(
      { _id: userId, email: caller.email, isAdmin: caller.isAdmin },
      { route: 'v1/account', actor: caller.email, reason: 'self-service' },
    );

    return new NextResponse(null, { status: 204, headers: V1_CORS_HEADERS });
  } catch (error) {
    return handleV1Error(error);
  }
}
