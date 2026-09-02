import type { NextRequest } from 'next/server';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { requireAdminApi } from '../../../../../lib/adminApiGuard';
import { adminStatsPayload } from '../../../../../lib/adminStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/admin/stats
 *
 * The numbers behind the website's /admin overview, for the app's admin
 * screen. Admin is verified here, server-side, on every call.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if (!guard.ok) return guard.response;

    const { status, body } = await adminStatsPayload();
    return jsonV1(body, { status });
  } catch (error) {
    return handleV1Error(error);
  }
}
