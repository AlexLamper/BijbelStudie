#!/usr/bin/env node
/**
 * Purge old rows from `deletedaccounts`. READ-ONLY unless --write.
 *
 *   MONGODB_URI=<uri> node scripts/purge-deleted-accounts.mjs --db scriptura
 *   MONGODB_URI=<uri> node scripts/purge-deleted-accounts.mjs --db scriptura --days 90 --write
 *
 * Why a script and not a TTL index: `deletedaccounts` is the safety net that
 * was missing on 2026-09-08 (models/DeletedAccount.js). A TTL index would let
 * MongoDB drop those copies on its own schedule, with no log of what went and
 * no chance to notice a wrong deletion first. This script does the same job
 * deliberately: it prints what it would remove, and only removes it when the
 * owner passes --write.
 *
 * Retention default is 90 days, the upper end of what the privacy policy
 * promises. Rows younger than --days are never touched, and neither is a row
 * whose archived user is an admin account (`isAdmin` or ADMIN_EMAILS) unless
 * --include-admins is given - those are the copies that matter most.
 *
 * `--db` is mandatory and must equal the database the URI connects to. That is
 * the guard against the ambient `.env.local` URI, which points at the dev
 * database: the script refuses to run against a database you did not name.
 */
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};
const flag = (name) => args.includes(name);

const dbName = opt('--db');
const daysArg = opt('--days');
const write = flag('--write');
const includeAdmins = flag('--include-admins');

const days = daysArg === null ? 90 : Number(daysArg);
if (!dbName || !Number.isFinite(days) || days < 30) {
  console.error('Usage: --db <name> [--days <>=30, default 90>] [--include-admins] [--write]');
  console.error('Retention below 30 days is refused: recovery requests arrive weeks late.');
  process.exit(2);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Pass the URI explicitly; do not rely on .env.local.');
  process.exit(2);
}

const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
const isProtected = (row) => {
  const user = row?.user ?? {};
  const email = String(user.email ?? row?.email ?? '').toLowerCase();
  return Boolean(user.isAdmin) || (email && adminEmails.has(email));
};

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
const db = mongoose.connection.db;
if (db.databaseName !== dbName) {
  console.error(`Refusing: connected to "${db.databaseName}" but --db says "${dbName}".`);
  await mongoose.disconnect();
  process.exit(3);
}
console.log(`database: ${db.databaseName}${write ? '  (WRITE MODE)' : '  (read-only)'}`);
if (adminEmails.size === 0 && !includeAdmins) {
  console.log('note: ADMIN_EMAILS is empty in this shell, so only the isAdmin flag protects a row.');
}

const cutoff = new Date(Date.now() - days * 86_400_000);
const collection = db.collection('deletedaccounts');
const total = await collection.countDocuments({});
const candidates = await collection
  .find({ deletedAt: { $lt: cutoff } })
  .sort({ deletedAt: 1 })
  .toArray();

console.log(`\nrows in deletedaccounts: ${total}`);
console.log(`retention: ${days} days (cutoff ${cutoff.toISOString()})`);
console.log(`older than cutoff: ${candidates.length}`);

const keep = [];
const remove = [];
for (const row of candidates) {
  (isProtected(row) && !includeAdmins ? keep : remove).push(row);
}
for (const row of remove) {
  console.log(
    `  purge  ${row.deletedAt?.toISOString?.()}  ${row.route}  ${row.email ?? row.user?.email ?? '-'}  userId=${row.userId}  counts=${JSON.stringify(row.counts ?? {})}`,
  );
}
for (const row of keep) {
  console.log(`  keep   ${row.deletedAt?.toISOString?.()}  ${row.email ?? row.user?.email ?? '-'}  (admin account)`);
}

if (remove.length === 0) {
  console.log('\nnothing to purge.');
  await mongoose.disconnect();
  process.exit(0);
}
if (!write) {
  console.log(`\nread-only run. Re-run with --write to delete those ${remove.length} rows. Nothing was changed.`);
  await mongoose.disconnect();
  process.exit(0);
}

const r = await collection.deleteMany({ _id: { $in: remove.map((row) => row._id) } });
console.log(`\ndeleted ${r.deletedCount}/${remove.length} archive rows. User documents were not touched.`);
await mongoose.disconnect();
