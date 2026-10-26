/**
 * One-off: fill `signupPlatform` and `platformsSeenAt` on accounts made before
 * lib/clientPlatform.ts started recording them.
 *
 *   node scripts/backfill-client-platforms.mjs           # dry run, prints counts
 *   node scripts/backfill-client-platforms.mjs --apply    # writes the changes
 *   ... --db scriptura                                     # production; default is the URI's own
 *
 * The only history there is lives in the RefreshToken collection: every app
 * login writes a row with the client's platform, and Mongo drops a row 120 days
 * after it was made (90-day expiry + 30 days, see models/RefreshToken.js). So:
 *
 * - signupPlatform. An account whose first token was issued within 30 minutes
 *   of its creation was made in the app, on that token's platform. An account
 *   without one was made on the website - but only where the token history
 *   reaches back far enough to be sure: made inside the 120-day window, or
 *   before the first app login ever (when nothing has been purged yet).
 *   Everything else stays null, which the admin shows as "onbekend".
 * - platformsSeenAt.ios / .android. The newest token use per platform. Never
 *   moves a date backwards. The website leaves no trace, so `web` is not filled.
 *
 * A heuristic, and labelled as one: an account made on the website and opened
 * in the app within the same half hour is counted as an app signup.
 *
 * ENVIRONMENT. Ambient MONGODB_URI wins; `.env.local` is the fallback for local
 * runs. Idempotent - only null fields and older dates are written.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const APPLY = process.argv.includes('--apply');
const dbFlag = process.argv.indexOf('--db');
const DB_NAME = dbFlag > -1 ? process.argv[dbFlag + 1] : undefined;
const SIGNUP_WINDOW_MS = 30 * 60 * 1000;
// One day short of the purge age, so a row on the edge is not half-gone.
const HISTORY_MS = 119 * 24 * 60 * 60 * 1000;

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI, DB_NAME ? { dbName: DB_NAME } : {});
  const db = mongoose.connection.db;
  console.log(`Database: ${db.databaseName}${APPLY ? '' : ' (dry run)'}`);

  const tokens = db.collection('refreshtokens');
  const users = db.collection('users');

  const first = await tokens.find({}, { projection: { createdAt: 1 } }).sort({ createdAt: 1 }).limit(1).next();
  const horizon = new Date(Date.now() - HISTORY_MS);
  // Nothing purged yet: the oldest row is the first app login there ever was.
  const firstAppLogin = first && first.createdAt > horizon ? first.createdAt : null;

  const perUser = await tokens
    .aggregate([
      {
        $group: {
          _id: { userId: '$userId', platform: '$platform' },
          firstAt: { $min: '$createdAt' },
          lastAt: { $max: { $max: ['$createdAt', { $ifNull: ['$lastUsedAt', '$createdAt'] }] } },
        },
      },
    ])
    .toArray();

  const byUser = new Map();
  for (const row of perUser) {
    const id = String(row._id.userId);
    if (!byUser.has(id)) byUser.set(id, []);
    byUser.get(id).push({ platform: row._id.platform || 'unknown', firstAt: row.firstAt, lastAt: row.lastAt });
  }

  const tally = { ios: 0, android: 0, web: 0, unknown: 0, left: 0, seen: 0 };
  const ops = [];

  const cursor = users.find({}, { projection: { createdAt: 1, signupPlatform: 1, platformsSeenAt: 1 } });
  for await (const user of cursor) {
    const rows = byUser.get(String(user._id)) ?? [];
    const set = {};

    if (user.signupPlatform == null && user.createdAt) {
      const created = user.createdAt.getTime();
      const atSignup = rows
        .filter((r) => r.firstAt.getTime() >= created - 60_000 && r.firstAt.getTime() - created <= SIGNUP_WINDOW_MS)
        .sort((a, b) => a.firstAt - b.firstAt)[0];
      let platform = null;
      if (atSignup) platform = ['ios', 'android', 'web'].includes(atSignup.platform) ? atSignup.platform : 'unknown';
      else if (user.createdAt >= horizon || (firstAppLogin && user.createdAt < firstAppLogin)) platform = 'web';

      if (platform) {
        set.signupPlatform = platform;
        tally[platform] += 1;
      } else {
        tally.left += 1;
      }
    }

    for (const r of rows) {
      if (r.platform !== 'ios' && r.platform !== 'android') continue;
      const current = user.platformsSeenAt?.[r.platform];
      if (!current || current < r.lastAt) set[`platformsSeenAt.${r.platform}`] = r.lastAt;
    }
    if (Object.keys(set).some((k) => k.startsWith('platformsSeenAt.'))) tally.seen += 1;

    if (Object.keys(set).length > 0) ops.push({ updateOne: { filter: { _id: user._id }, update: { $set: set } } });
  }

  console.log(`Token history from: ${first ? first.createdAt.toISOString() : 'none'} (complete: ${!!firstAppLogin})`);
  console.log(
    `signupPlatform -> ios ${tally.ios}, android ${tally.android}, web ${tally.web}, unknown ${tally.unknown}; ` +
      `left null ${tally.left}`,
  );
  console.log(`platformsSeenAt updated on ${tally.seen} accounts`);

  if (APPLY && ops.length > 0) {
    const result = await users.bulkWrite(ops, { ordered: false });
    console.log(`Written: ${result.modifiedCount} accounts`);
  } else if (!APPLY) {
    console.log(`Would write ${ops.length} accounts. Re-run with --apply.`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
