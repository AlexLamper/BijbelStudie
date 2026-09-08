#!/usr/bin/env node
/**
 * Find and restore a deleted account's progress. READ-ONLY unless --write.
 *
 *   MONGODB_URI=<production uri> node scripts/recover-account.mjs --db scriptura --email you@example.com
 *   MONGODB_URI=<production uri> node scripts/recover-account.mjs --db scriptura --old-id <ObjectId>
 *   MONGODB_URI=<production uri> node scripts/recover-account.mjs --db scriptura --old-id <id> --into <newUserId> --write
 *
 * `--db` is mandatory and must equal the database the URI connects to. That is
 * the guard against the ambient `.env.local` URI, which points at the dev
 * database: the script refuses to run against a database you did not name.
 *
 * What it does:
 *   1. Looks for a copy in `deletedaccounts` (written by lib/accountArchive.ts
 *      since 2026-09-08) for the email or id.
 *   2. Scans every collection keyed on `userId` for documents whose user no
 *      longer exists ("orphans"): readinghistories, readingsessions,
 *      studyprogress, studylessonstate, studyenrollments, planenrollments,
 *      notes, bookmarks, aiusages, groupmessages, analyticsevents.
 *   3. Rebuilds what it can for the target id: readChapters (from the archive
 *      if there is one, else from readinghistories + studyprogress + notes +
 *      analytics events), active days, longest run of consecutive days.
 *   4. Prints a proposed patch. With --write and --into it applies it
 *      ADDITIVELY to the new document ($addToSet / $max only - nothing is ever
 *      removed) and re-points the orphaned documents to the new id.
 */
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};
const flag = (name) => args.includes(name);

const dbName = opt('--db');
const email = opt('--email');
const oldIdArg = opt('--old-id');
const into = opt('--into');
const write = flag('--write');

if (!dbName || (!email && !oldIdArg)) {
  console.error('Usage: --db <name> (--email <address> | --old-id <ObjectId>) [--into <newUserId> --write]');
  process.exit(2);
}
if (write && !into) {
  console.error('--write needs --into <newUserId>');
  process.exit(2);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Pass the production URI explicitly; do not rely on .env.local.');
  process.exit(2);
}

const ORPHAN_COLLECTIONS = [
  'readinghistories',
  'readingsessions',
  'studyprogress',
  'studylessonstate',
  'studyenrollments',
  'planenrollments',
  'notes',
  'bookmarks',
  'aiusages',
  'groupmessages',
  'analyticsevents',
];

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(String(v)) : null);
const dayKey = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : null);

function longestRun(days) {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of sorted) {
    const t = Date.parse(day);
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    prev = t;
    best = Math.max(best, run);
  }
  return best;
}

function addChapter(map, book, chapter) {
  if (typeof book !== 'string' || !book.trim()) return;
  const n = Number(chapter);
  if (!Number.isInteger(n) || n < 1) return;
  const key = book.trim();
  (map[key] ??= new Set()).add(n);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
const db = mongoose.connection.db;
if (db.databaseName !== dbName) {
  console.error(`Refusing: connected to "${db.databaseName}" but --db says "${dbName}".`);
  await mongoose.disconnect();
  process.exit(3);
}
console.log(`database: ${db.databaseName}${write ? '  (WRITE MODE)' : '  (read-only)'}`);

const existing = await db.collection('deletedaccounts').find(
  email ? { email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : { userId: oid(oldIdArg) },
).sort({ deletedAt: -1 }).toArray();

console.log(`\narchive copies in deletedaccounts: ${existing.length}`);
for (const a of existing) {
  console.log(`  ${a.deletedAt?.toISOString?.()}  ${a.route}  by ${a.actor ?? '-'}  userId=${a.userId}  counts=${JSON.stringify(a.counts ?? {})}`);
}
const archive = existing[0] ?? null;

// Orphan scan.
const users = db.collection('users');
const orphans = {};
for (const name of ORPHAN_COLLECTIONS) {
  const cols = await db.listCollections({ name }).toArray();
  if (cols.length === 0) continue;
  const ids = await db.collection(name).distinct('userId');
  for (const id of ids) {
    if (!id) continue;
    const key = String(id);
    if (orphans[key] === undefined) {
      const alive = await users.countDocuments({ _id: id }, { limit: 1 });
      orphans[key] = alive ? null : {};
    }
    if (orphans[key] === null) continue;
    const c = db.collection(name);
    const n = await c.countDocuments({ userId: id });
    const first = await c.find({ userId: id }).sort({ _id: 1 }).limit(1).toArray();
    const last = await c.find({ userId: id }).sort({ _id: -1 }).limit(1).toArray();
    orphans[key][name] = {
      n,
      first: first[0]?._id?.getTimestamp?.()?.toISOString?.().slice(0, 10),
      last: last[0]?._id?.getTimestamp?.()?.toISOString?.().slice(0, 10),
    };
  }
}
const orphanIds = Object.entries(orphans).filter(([, v]) => v && Object.keys(v).length > 0);
console.log(`\norphaned userIds (documents whose user no longer exists): ${orphanIds.length}`);
for (const [id, cols] of orphanIds) {
  console.log(`  ${id}: ${Object.entries(cols).map(([c, v]) => `${c}=${v.n} (${v.first}..${v.last})`).join(', ')}`);
}

// Target.
const targetId = oid(oldIdArg) ?? (archive ? archive.userId : orphanIds.length === 1 ? oid(orphanIds[0][0]) : null);
if (!targetId) {
  console.log('\nNo single target id: pass --old-id <ObjectId> from the list above.');
  await mongoose.disconnect();
  process.exit(0);
}
console.log(`\ntarget old userId: ${targetId}`);

// Rebuild.
const chapters = {};
const days = new Set();
const archivedUser = archive?.user ?? null;
if (archivedUser?.readChapters && typeof archivedUser.readChapters === 'object') {
  for (const [book, list] of Object.entries(archivedUser.readChapters)) {
    for (const ch of Array.isArray(list) ? list : []) addChapter(chapters, book, ch);
  }
}
const q = { userId: targetId };
for (const doc of await db.collection('readinghistories').find(q).toArray()) {
  addChapter(chapters, doc.book, doc.chapter);
  const d = dayKey(doc.readAt ?? doc.createdAt);
  if (d) days.add(d);
}
for (const doc of await db.collection('studyprogress').find(q).toArray()) {
  addChapter(chapters, doc.book, doc.chapter);
  const d = dayKey(doc.completedAt ?? doc.createdAt);
  if (d) days.add(d);
}
for (const doc of await db.collection('notes').find(q).toArray()) {
  addChapter(chapters, doc.book, doc.chapter);
  const d = dayKey(doc.createdAt);
  if (d) days.add(d);
}
for (const doc of await db.collection('readingsessions').find(q).toArray()) {
  const d = dayKey(doc.createdAt);
  if (d) days.add(d);
}
const analytics = await db.listCollections({ name: 'analyticsevents' }).toArray();
if (analytics.length) {
  for (const doc of await db.collection('analyticsevents').find(q).toArray()) {
    const p = doc.props ?? {};
    if (p.book && p.chapter) addChapter(chapters, p.book, p.chapter);
    const d = dayKey(doc.occurredAt ?? doc.createdAt);
    if (d) days.add(d);
  }
}
const readChapters = Object.fromEntries(Object.entries(chapters).map(([b, s]) => [b, [...s].sort((a, c) => a - c)]));
const totalChapters = Object.values(readChapters).reduce((n, l) => n + l.length, 0);

const proposal = {
  readChapters,
  books: Object.keys(readChapters).length,
  chapters: totalChapters,
  activeDays: days.size,
  longestRun: longestRun(days),
  firstActiveDay: [...days].sort()[0] ?? null,
  lastActiveDay: [...days].sort().at(-1) ?? null,
  fromArchive: archivedUser
    ? {
        streak: archivedUser.streak,
        longestStreak: archivedUser.longestStreak,
        lastStreakDate: archivedUser.lastStreakDate,
        xp: archivedUser.xp,
        level: archivedUser.level,
        badges: archivedUser.badges,
        levensboom: archivedUser.levensboom,
        preferences: archivedUser.preferences,
        createdAt: archivedUser.createdAt,
      }
    : null,
};
console.log('\nproposed restore (additive):');
console.log(JSON.stringify({ ...proposal, readChapters: `${proposal.books} books / ${proposal.chapters} chapters` }, null, 2));

if (!write) {
  console.log('\nread-only run. Re-run with --into <newUserId> --write to apply. Nothing was changed.');
  await mongoose.disconnect();
  process.exit(0);
}

// Apply, additively.
const newId = oid(into);
const newUser = newId ? await users.findOne({ _id: newId }) : null;
if (!newUser) {
  console.error(`--into ${into} is not an existing user`);
  await mongoose.disconnect();
  process.exit(3);
}
const addToSet = {};
for (const [book, list] of Object.entries(readChapters)) addToSet[`readChapters.${book}`] = { $each: list };
const max = {};
if (archivedUser) {
  for (const f of ['streak', 'longestStreak', 'xp', 'level']) {
    if (typeof archivedUser[f] === 'number') max[f] = archivedUser[f];
  }
}
if (proposal.longestRun > 0) max.longestStreak = Math.max(max.longestStreak ?? 0, proposal.longestRun);
if (Array.isArray(archivedUser?.badges) && archivedUser.badges.length) addToSet.badges = { $each: archivedUser.badges };

const update = {};
if (Object.keys(addToSet).length) update.$addToSet = addToSet;
if (Object.keys(max).length) update.$max = max;
if (Object.keys(update).length) {
  const r = await users.updateOne({ _id: newId }, update);
  console.log(`\nusers.updateOne(${newId}) matched=${r.matchedCount} modified=${r.modifiedCount}`);
}
for (const name of ORPHAN_COLLECTIONS) {
  const cols = await db.listCollections({ name }).toArray();
  if (cols.length === 0) continue;
  const r = await db.collection(name).updateMany({ userId: targetId }, { $set: { userId: newId } });
  if (r.matchedCount) console.log(`${name}: re-pointed ${r.modifiedCount}/${r.matchedCount} documents to ${newId}`);
}
console.log('\ndone. Nothing was deleted.');
await mongoose.disconnect();
