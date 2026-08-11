import type { NextRequest } from 'next/server';
import connectMongoDB from '../../../../lib/mongodb';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import { requireUser } from '../../../../lib/apiAuth';
import {
  SYNC_KINDS,
  assertClientId,
  deleteRecord,
  isSyncKind,
  listRecords,
  listTombstones,
  upsertRecord,
  type SyncRecord,
} from '../../../../lib/mobileUserData';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return corsPreflight();
}

const MAX_CHANGES = 500;

/**
 * POST /api/v1/sync
 *
 * Body: { since?: ISO string, changes?: Change[] }
 *   Change = { id, kind, updatedAt, deletedAt?, data? }
 *
 * Returns: { serverChanges: SyncRecord[], serverTime, applied, rejected }
 *
 * CONFLICT RULE — last write wins by `updatedAt`; a tie goes to the server.
 * The client's change is applied only when its `updatedAt` is strictly newer
 * than the stored row's. Anything older comes back in `serverChanges` so the
 * device can overwrite its stale copy rather than retrying forever.
 *
 * Deletes are tombstones, never hard deletes from the sync protocol's point of
 * view: a device that has been offline cannot resurrect a deleted row by
 * pushing the copy it still holds, because the tombstone outranks it.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      since?: unknown;
      changes?: unknown;
    };

    const since = typeof body.since === 'string' ? new Date(body.since) : null;
    if (since && Number.isNaN(since.getTime())) {
      return errorV1('INVALID_SINCE', 400, 'since moet een ISO-8601 tijdstip zijn.');
    }

    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (changes.length > MAX_CHANGES) {
      return errorV1('TOO_MANY_CHANGES', 413, `Maximaal ${MAX_CHANGES} wijzigingen per verzoek.`);
    }

    await connectMongoDB();

    let applied = 0;
    const rejected: Array<{ id: string; reason: string }> = [];

    for (const raw of changes) {
      const change = raw as Record<string, unknown>;
      try {
        if (!isSyncKind(change.kind)) {
          rejected.push({ id: String(change.id ?? ''), reason: 'UNKNOWN_KIND' });
          continue;
        }
        const id = assertClientId(change.id);
        const kind = change.kind;

        if (change.deletedAt) {
          const when = new Date(String(change.deletedAt));
          await deleteRecord(user.id, kind, id, Number.isNaN(when.getTime()) ? null : when);
          applied += 1;
          continue;
        }

        const clientUpdatedAt =
          typeof change.updatedAt === 'string' ? new Date(change.updatedAt) : null;
        const outcome = await upsertRecord(
          user.id,
          kind,
          id,
          (change.data ?? {}) as Record<string, unknown>,
          clientUpdatedAt && !Number.isNaN(clientUpdatedAt.getTime()) ? clientUpdatedAt : null,
        );

        if (outcome.skipped) {
          rejected.push({ id, reason: outcome.skipped === 'stale' ? 'STALE' : 'DELETED' });
        } else {
          applied += 1;
        }
      } catch (e) {
        rejected.push({
          id: String(change.id ?? ''),
          reason: e instanceof Error ? e.message.slice(0, 120) : 'INVALID',
        });
      }
    }

    // Pull happens after push so a client sees the result of its own writes in
    // the same round trip.
    const serverChanges: SyncRecord[] = [];
    for (const kind of SYNC_KINDS) {
      serverChanges.push(...(await listRecords(user.id, kind, since)));
    }
    serverChanges.push(...(await listTombstones(user.id, since)));

    return jsonV1({
      serverChanges,
      serverTime: new Date().toISOString(),
      applied,
      rejected,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}
