import mongoose from 'mongoose';
import Note from '../models/Note';
import Bookmark from '../models/Bookmark';
import ReadingHistory from '../models/ReadingHistory';
import SyncTombstone from '../models/SyncTombstone';

/**
 * The four synchronisable record kinds, behind one interface so the CRUD
 * routes and the batch sync endpoint cannot disagree about validation,
 * ownership or conflict handling.
 *
 * Records are addressed by a client-generated UUID (`id`), never by Mongo
 * `_id`. That is what lets a device create a record offline, hand it a
 * permanent identity immediately, and have a retried upload be a no-op instead
 * of a duplicate.
 *
 * CONFLICT RULE - last write wins by `updatedAt`, ties go to the server.
 * An incoming change older than the stored row is dropped, not merged: a
 * device that has been offline for a week must not silently overwrite edits
 * made on the website since. Deletes are tombstones (see SyncTombstone), so a
 * device that never saw the delete cannot resurrect the row by pushing its
 * stale copy.
 */

export type SyncKind = 'note' | 'highlight' | 'bookmark' | 'reading-history';

export const SYNC_KINDS: SyncKind[] = ['note', 'highlight', 'bookmark', 'reading-history'];

export function isSyncKind(value: unknown): value is SyncKind {
  return typeof value === 'string' && (SYNC_KINDS as string[]).includes(value);
}

export type SyncRecord = {
  id: string;
  kind: SyncKind;
  updatedAt: string;
  deletedAt: string | null;
  data: Record<string, unknown>;
};

/**
 * Three id shapes reach the app from the list endpoint, and every one must
 * come back through edit and delete:
 *  - a UUID minted on a device;
 *  - `web-<uuid>`, which app/api/notes stamps on notes written on the website;
 *  - a bare 24-hex Mongo `_id`, for website notes older than clientId.
 * The old hex-only pattern 400'd the `web-` shape, and the app treats a 400 as
 * final - so every note written on the website was undeletable from the app.
 * Still strictly [0-9a-f-] after the prefix: no Mongo operator syntax.
 */
const CLIENT_ID_RE = /^(?:web-)?[0-9a-fA-F-]{8,64}$/;

export function assertClientId(value: unknown): string {
  if (typeof value !== 'string' || !CLIENT_ID_RE.test(value)) {
    const err = new Error('Invalid client id');
    (err as { status?: number }).status = 400;
    throw err;
  }
  return value;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date().toISOString();
}

function num(value: unknown, fallback: number | null = null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

// --- per-kind mapping -------------------------------------------------------

const HIGHLIGHT_COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

/**
 * Notes and highlights share the `Note` collection so that anything created in
 * the app also shows up on the website. `type` is the discriminator the web
 * app already uses.
 */
function noteQueryTypes(kind: 'note' | 'highlight'): string[] {
  return kind === 'highlight' ? ['highlight'] : ['note', 'both'];
}

function serialiseNote(doc: Record<string, unknown>, kind: 'note' | 'highlight'): SyncRecord {
  return {
    id: str(doc.clientId, String(doc._id)),
    kind,
    updatedAt: toIso(doc.updatedAt),
    deletedAt: null,
    data: {
      book: doc.book,
      chapter: doc.chapter,
      verse: doc.verse ?? null,
      verseEnd: doc.verseEnd ?? null,
      verseReference: doc.verseReference,
      verseText: doc.verseText,
      translation: doc.translation,
      noteText: doc.noteText,
      highlightColor: doc.highlightColor,
      tags: doc.tags ?? [],
      type: doc.type,
    },
  };
}

function noteFieldsFrom(data: Record<string, unknown>, kind: 'note' | 'highlight') {
  const book = str(data.book);
  const chapter = num(data.chapter);
  if (!book || chapter === null) {
    const err = new Error('book and chapter are required');
    (err as { status?: number }).status = 400;
    throw err;
  }

  const verse = num(data.verse);
  const reference = str(data.verseReference) || `${book} ${chapter}${verse ? `:${verse}` : ''}`;
  const color = str(data.highlightColor, 'yellow');

  return {
    book,
    chapter,
    verse: verse ?? undefined,
    verseEnd: num(data.verseEnd) ?? undefined,
    verseReference: reference,
    // `verseText` and `noteText` are required by the existing schema. A pure
    // highlight has no note text, so an empty-but-present string keeps the
    // website's validation happy without inventing content.
    verseText: str(data.verseText, ' '),
    noteText: str(data.noteText, kind === 'highlight' ? ' ' : ''),
    translation: str(data.translation, 'statenvertaling'),
    highlightColor: HIGHLIGHT_COLORS.includes(color) ? color : 'yellow',
    tags: Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === 'string').slice(0, 20) : [],
    type: kind === 'highlight' ? 'highlight' : 'note',
    language: 'nl',
  };
}

function serialiseBookmark(doc: Record<string, unknown>): SyncRecord {
  return {
    id: str(doc.clientId),
    kind: 'bookmark',
    updatedAt: toIso(doc.updatedAt),
    deletedAt: null,
    data: {
      book: doc.book,
      chapter: doc.chapter,
      verse: doc.verse ?? null,
      version: doc.version ?? null,
      label: doc.label ?? null,
    },
  };
}

function bookmarkFieldsFrom(data: Record<string, unknown>) {
  const book = str(data.book);
  const chapter = num(data.chapter);
  if (!book || chapter === null) {
    const err = new Error('book and chapter are required');
    (err as { status?: number }).status = 400;
    throw err;
  }
  return {
    book,
    chapter,
    verse: num(data.verse) ?? undefined,
    version: str(data.version) || undefined,
    label: str(data.label).slice(0, 200) || undefined,
  };
}

function serialiseHistory(doc: Record<string, unknown>): SyncRecord {
  return {
    id: str(doc.clientId),
    kind: 'reading-history',
    updatedAt: toIso(doc.updatedAt),
    deletedAt: null,
    data: {
      book: doc.book,
      chapter: doc.chapter,
      version: doc.version,
      scrollProgress: doc.scrollProgress ?? 0,
      readAt: toIso(doc.readAt),
    },
  };
}

function historyFieldsFrom(data: Record<string, unknown>) {
  const book = str(data.book);
  const chapter = num(data.chapter);
  const version = str(data.version);
  if (!book || chapter === null || !version) {
    const err = new Error('book, chapter and version are required');
    (err as { status?: number }).status = 400;
    throw err;
  }
  const readAtRaw = data.readAt;
  const readAt = typeof readAtRaw === 'string' ? new Date(readAtRaw) : new Date();
  const progress = num(data.scrollProgress, 0) ?? 0;

  return {
    book,
    chapter,
    version,
    scrollProgress: Math.min(Math.max(progress, 0), 1),
    readAt: Number.isNaN(readAt.getTime()) ? new Date() : readAt,
  };
}

// --- CRUD -------------------------------------------------------------------

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Finds the Note a sync id refers to. A note created on the website has no
 * `clientId`, so `serialiseNote` hands the app its Mongo `_id` instead - and
 * the app sends that id straight back on edit and delete. Matching on
 * `clientId` alone found nothing for those notes: a delete answered 204 and
 * removed nothing (the note reappeared on the next refetch), and an edit
 * upserted a duplicate.
 */
async function findNoteBySyncId(user: mongoose.Types.ObjectId, id: string) {
  const byClientId = await Note.findOne({ userId: user, clientId: id });
  if (byClientId || !OBJECT_ID_RE.test(id)) return byClientId;
  return Note.findOne({ userId: user, _id: id, clientId: null });
}

export async function listRecords(
  userId: string,
  kind: SyncKind,
  since?: Date | null,
): Promise<SyncRecord[]> {
  const userFilter: Record<string, unknown> = { userId: oid(userId) };
  if (since) userFilter.updatedAt = { $gt: since };

  if (kind === 'note' || kind === 'highlight') {
    const docs = await Note.find({ ...userFilter, type: { $in: noteQueryTypes(kind) } })
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map((d) => serialiseNote(d as Record<string, unknown>, kind));
  }
  if (kind === 'bookmark') {
    const docs = await Bookmark.find(userFilter).sort({ updatedAt: -1 }).lean();
    return docs.map((d) => serialiseBookmark(d as Record<string, unknown>));
  }
  const docs = await ReadingHistory.find(userFilter).sort({ readAt: -1 }).limit(500).lean();
  return docs.map((d) => serialiseHistory(d as Record<string, unknown>));
}

export async function listTombstones(
  userId: string,
  since?: Date | null,
): Promise<SyncRecord[]> {
  const filter: Record<string, unknown> = { userId: oid(userId) };
  if (since) filter.deletedAt = { $gt: since };

  const docs = await SyncTombstone.find(filter).sort({ deletedAt: -1 }).lean();
  return docs.map((d) => {
    const doc = d as Record<string, unknown>;
    return {
      id: str(doc.clientId),
      kind: doc.kind as SyncKind,
      updatedAt: toIso(doc.deletedAt),
      deletedAt: toIso(doc.deletedAt),
      data: {},
    };
  });
}

export type UpsertOutcome = {
  record: SyncRecord | null;
  /**
   * `limit`: the write would have created a note and the free note limit
   * (lib/entitlements.ts) refused it. Nothing was written.
   */
  skipped: 'stale' | 'deleted' | 'limit' | null;
  /**
   * True only when this call brought the record into existence. Note XP
   * (lib/noteXp.ts) is paid on creates and never on edits, and the caller has
   * no other way to tell the two apart - an upsert looks identical from
   * outside.
   */
  created: boolean;
};

/**
 * Creates or updates one record.
 *
 * Returns `skipped: 'stale'` when the incoming `updatedAt` is older than what
 * is stored, and `skipped: 'deleted'` when a tombstone already exists for this
 * id - both are normal outcomes of a device catching up, not errors.
 */
export async function upsertRecord(
  userId: string,
  kind: SyncKind,
  clientId: string,
  data: Record<string, unknown>,
  clientUpdatedAt?: Date | null,
  options: {
    /**
     * Asked only when the write would CREATE a note (kind "note"), never for an
     * edit or a highlight - see `noteCreationGuard` in lib/noteXp.ts. Every v1
     * path that can create a note passes it: POST, PATCH (which upserts too)
     * and the batched /sync.
     */
    canCreateNote?: () => Promise<boolean>;
  } = {},
): Promise<UpsertOutcome> {
  const user = oid(userId);

  const tombstone = await SyncTombstone.findOne({ userId: user, kind, clientId });
  if (tombstone) return { record: null, skipped: 'deleted', created: false };

  if (kind === 'note' || kind === 'highlight') {
    const existing = await findNoteBySyncId(user, clientId);
    if (existing && isStale(existing.updatedAt, clientUpdatedAt)) {
      return { record: serialiseNote(existing.toObject(), kind), skipped: 'stale', created: false };
    }
    if (!existing && kind === 'note' && options.canCreateNote && !(await options.canCreateNote())) {
      return { record: null, skipped: 'limit', created: false };
    }
    const fields = noteFieldsFrom(data, kind);
    // A website "both" note shows up in the app's notes list; editing its text
    // there must not silently drop the highlight half.
    if (existing?.type === 'both' && kind === 'note') fields.type = 'both';
    const doc = existing
      ? await Note.findOneAndUpdate(
          { _id: existing._id, userId: user },
          // Website notes gain the id the app already knows them by, so every
          // later lookup takes the plain clientId path.
          { $set: { ...fields, clientId } },
          { new: true },
        )
      : await Note.findOneAndUpdate(
          { userId: user, clientId },
          { $set: { ...fields, userId: user, clientId } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
    return { record: serialiseNote(doc.toObject(), kind), skipped: null, created: !existing };
  }

  if (kind === 'bookmark') {
    const existing = await Bookmark.findOne({ userId: user, clientId });
    if (existing && isStale(existing.updatedAt, clientUpdatedAt)) {
      return { record: serialiseBookmark(existing.toObject()), skipped: 'stale', created: false };
    }
    const doc = await Bookmark.findOneAndUpdate(
      { userId: user, clientId },
      { $set: { ...bookmarkFieldsFrom(data), userId: user, clientId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { record: serialiseBookmark(doc.toObject()), skipped: null, created: !existing };
  }

  const existing = await ReadingHistory.findOne({ userId: user, clientId });
  if (existing && isStale(existing.updatedAt, clientUpdatedAt)) {
    return { record: serialiseHistory(existing.toObject()), skipped: 'stale', created: false };
  }
  const doc = await ReadingHistory.findOneAndUpdate(
    { userId: user, clientId },
    { $set: { ...historyFieldsFrom(data), userId: user, clientId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return { record: serialiseHistory(doc.toObject()), skipped: null, created: !existing };
}

function isStale(serverUpdatedAt: unknown, clientUpdatedAt?: Date | null): boolean {
  if (!clientUpdatedAt || !(serverUpdatedAt instanceof Date)) return false;
  // Ties go to the server: equal timestamps mean the client has nothing new.
  return clientUpdatedAt.getTime() <= serverUpdatedAt.getTime();
}

export async function deleteRecord(
  userId: string,
  kind: SyncKind,
  clientId: string,
  deletedAt?: Date | null,
): Promise<boolean> {
  const user = oid(userId);
  const when = deletedAt ?? new Date();

  let removed = 0;
  if (kind === 'note' || kind === 'highlight') {
    const existing = await findNoteBySyncId(user, clientId);
    if (existing) {
      removed = (await Note.deleteOne({ _id: existing._id, userId: user })).deletedCount ?? 0;
    }
  } else if (kind === 'bookmark') {
    removed = (await Bookmark.deleteOne({ userId: user, clientId })).deletedCount ?? 0;
  } else {
    removed = (await ReadingHistory.deleteOne({ userId: user, clientId })).deletedCount ?? 0;
  }

  // The tombstone is written whether or not a row was found: the delete may be
  // replayed from a second device that already applied it locally, and the
  // tombstone is what stops a third device from pushing the row back.
  await SyncTombstone.updateOne(
    { userId: user, kind, clientId },
    { $set: { deletedAt: when } },
    { upsert: true },
  );

  return removed > 0;
}
