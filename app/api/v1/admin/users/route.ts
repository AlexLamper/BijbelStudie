import type { NextRequest } from 'next/server';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { requireAdminApi } from '../../../../../lib/adminApiGuard';
import { adminUsersPayload } from '../../../../../lib/adminUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/admin/users?q=&limit=
 *
 * The same rows as /admin/users on the website. This response carries every
 * account's email, so the admin check is not optional here in any sense.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if (!guard.ok) return guard.response;

    const { status, body } = await adminUsersPayload({
      search: req.nextUrl.searchParams.get('q'),
      limit: req.nextUrl.searchParams.get('limit'),
    });
    return jsonV1(body, { status });
  } catch (error) {
    return handleV1Error(error);
  }
}
