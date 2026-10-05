import { requireUser } from '../../../../../../../lib/apiAuth';
import { corsPreflight, errorV1, jsonV1 } from '../../../../../../../lib/apiV1';
import { reportContent } from '../../../../../../../lib/friends/service';
import { checkRateLimit } from '../../../../../../../lib/mobileRateLimit';
import { PRIVATE, handleFriendsError, readBody } from '../../../_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/friends/posts/:id/report - report the post, or with
 * `commentId` one comment under it (VRIENDENKRING_PLAN.md §5).
 *
 * Body: `{ reason, note?, commentId? }`, reason one of
 * lib/friends/types.ts `REPORT_REASONS`.
 *
 * Throttled at 10 per hour per account: an in-process courtesy limit
 * (lib/mobileRateLimit), so the real ceiling is instances x limit. Ten is
 * generous for genuine reporting and low enough that nobody fills the
 * moderation queue from one session. Reporting the same thing twice is an
 * upsert, not a new row, so a retry does not eat the budget twice over.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    const limit = checkRateLimit(`friends:report:${auth.id}`, 10, 60 * 60);
    if (!limit.allowed) return errorV1('RATE_LIMITED', 429, 'Even wachten met melden.');
    const { id } = await params;
    return jsonV1(await reportContent(auth.id, id, await readBody(req)), { status: 201, ...PRIVATE });
  } catch (error) {
    return handleFriendsError(error);
  }
}
