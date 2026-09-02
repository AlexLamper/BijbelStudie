import type { NextRequest } from 'next/server';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { requireAdminApi } from '../../../../../lib/adminApiGuard';
import { adminInsightsPayload } from '../../../../../lib/adminInsights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * GET /api/v1/admin/insights?days=7|30|90
 *
 * Same aggregates as /admin/insights on the website. `days` is clamped to
 * 7..365 by the shared helper.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminApi(req);
    if (!guard.ok) return guard.response;

    const days = req.nextUrl.searchParams.get('days');
    const { status, body } = await adminInsightsPayload(days ?? 30);
    return jsonV1(body, { status });
  } catch (error) {
    return handleV1Error(error);
  }
}
