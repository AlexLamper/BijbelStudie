import type { NextRequest } from 'next/server';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../../../lib/apiV1';
import { requireAdminApi } from '../../../../../../lib/adminApiGuard';
import {
  deleteAdminUserPayload,
  updateAdminUserPayload,
} from '../../../../../../lib/adminUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * PATCH /api/v1/admin/users/:id — `{ isAdmin?: boolean, subscribed?: boolean }`.
 * Everything else in the body is ignored by the shared helper.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireAdminApi(req);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const result = await updateAdminUserPayload(id, body, guard.user.email);
    return jsonV1(result.body, { status: result.status });
  } catch (error) {
    return handleV1Error(error);
  }
}

/** DELETE /api/v1/admin/users/:id — removes the account and its notes. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireAdminApi(req);
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const result = await deleteAdminUserPayload(id, guard.user.email);
    return jsonV1(result.body, { status: result.status });
  } catch (error) {
    return handleV1Error(error);
  }
}
