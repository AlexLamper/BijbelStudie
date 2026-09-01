import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import connectMongoDB from './mongodb';
import { corsPreflight, errorV1, handleV1Error, jsonV1, V1_CORS_HEADERS } from './apiV1';
import { requireUser } from './apiAuth';
import {
  assertClientId,
  deleteRecord,
  listRecords,
  upsertRecord,
  type SyncKind,
} from './mobileUserData';

/**
 * The four user-data collections differ only in their kind, so they share one
 * set of handlers. Four hand-written copies would drift on the first bug fix.
 */

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function collectionHandlers(kind: SyncKind) {
  return {
    OPTIONS: async () => corsPreflight(),

    /** GET ?since=<ISO> - omit `since` for everything. */
    GET: async (req: NextRequest) => {
      try {
        const user = await requireUser(req);
        await connectMongoDB();
        const since = parseDate(new URL(req.url).searchParams.get('since'));
        const items = await listRecords(user.id, kind, since);
        return jsonV1({ kind, items, serverTime: new Date().toISOString() });
      } catch (error) {
        return handleV1Error(error);
      }
    },

    /** POST - create or replace by client id. Idempotent on retry. */
    POST: async (req: NextRequest) => {
      try {
        const user = await requireUser(req);
        const body = (await req.json()) as Record<string, unknown>;
        const id = assertClientId(body.id);
        const data = (body.data ?? body) as Record<string, unknown>;

        await connectMongoDB();
        const outcome = await upsertRecord(
          user.id,
          kind,
          id,
          data,
          parseDate(typeof body.updatedAt === 'string' ? body.updatedAt : null),
        );

        if (outcome.skipped === 'deleted') {
          return errorV1('RECORD_DELETED', 409, 'Dit item is verwijderd.');
        }
        return jsonV1({ item: outcome.record, skipped: outcome.skipped }, { status: 201 });
      } catch (error) {
        return statusAwareError(error);
      }
    },
  };
}

export function itemHandlers(kind: SyncKind) {
  return {
    OPTIONS: async () => corsPreflight(),

    PATCH: async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
      try {
        const user = await requireUser(req);
        const { id } = await ctx.params;
        assertClientId(id);
        const body = (await req.json()) as Record<string, unknown>;
        const data = (body.data ?? body) as Record<string, unknown>;

        await connectMongoDB();
        const outcome = await upsertRecord(
          user.id,
          kind,
          id,
          data,
          parseDate(typeof body.updatedAt === 'string' ? body.updatedAt : null),
        );

        if (outcome.skipped === 'deleted') {
          return errorV1('RECORD_DELETED', 409, 'Dit item is verwijderd.');
        }
        return jsonV1({ item: outcome.record, skipped: outcome.skipped });
      } catch (error) {
        return statusAwareError(error);
      }
    },

    DELETE: async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
      try {
        const user = await requireUser(req);
        const { id } = await ctx.params;
        assertClientId(id);

        await connectMongoDB();
        await deleteRecord(user.id, kind, id);
        // 204 even when nothing was found: deleting an already-deleted record
        // is the expected outcome of a retry, not a failure.
        return new NextResponse(null, { status: 204, headers: V1_CORS_HEADERS });
      } catch (error) {
        return statusAwareError(error);
      }
    },
  };
}

/** Validation helpers throw plain Errors carrying a `status`. */
function statusAwareError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  if (status === 400) {
    return errorV1('INVALID_REQUEST', 400, (error as Error).message);
  }
  return handleV1Error(error);
}
