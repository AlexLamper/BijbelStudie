import { NextResponse } from 'next/server';
import { PlanError, type PlanDTO } from './planService';

/**
 * Shared shaping for the website's `/api/bible-plans/*` routes.
 *
 * App Router forbids extra exports from `route.ts`, so anything two handlers
 * both need lives here — the same reason `lib/mobile*.ts` exists.
 */

/**
 * `_id` is mirrored alongside `id` because the website components were written
 * against the raw Mongo document, and `completedDaysCount` preserves the old
 * list-endpoint meaning of `completedDays` (a count) now that the field is
 * consistently an array everywhere.
 */
export function withLegacyId(plan: PlanDTO) {
  return { ...plan, _id: plan.id, completedDaysCount: plan.completedDays.length };
}

export function planErrorResponse(error: unknown, context: string) {
  if (error instanceof PlanError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof Error && error.name === 'UnauthorizedError') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.error(`[${context}]`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
