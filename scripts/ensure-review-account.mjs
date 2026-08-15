/**
 * Creates (or repairs) the App Store review demo account.
 *
 * App review 1.0(5) was rejected under guideline 2.1 - Information Needed
 * because the credentials filed in App Store Connect did not authenticate.
 * Reviewers get one attempt at this; if the account is missing, has a stale
 * password, or is not Pro, the submission comes back regardless of how well
 * the app works.
 *
 * Pro is granted through `subscribed`, NOT `storePremium`, and that choice is
 * load-bearing. The app calls POST /api/v1/sync-premium on every launch, which
 * asks RevenueCat for the truth and writes `storePremium` from the answer.
 * RevenueCat has never heard of this account, so a `storePremium` grant would
 * be reset to false the second time the reviewer opened the app — Pro on the
 * first launch, gone on the next. `applyStorePremium` deliberately never
 * touches `subscribed`, so a grant made here survives every sync.
 *
 * `resolveIsPro` ORs the two, so the reviewer sees every paid feature either
 * way; `resolveProSource` reports "stripe", which is the honest label for an
 * entitlement granted outside the store and puts the paywall in its
 * multiplatform-exception state (no purchase button, per guideline 3.1.1).
 *
 *   REVIEW_PASSWORD='...' node scripts/ensure-review-account.mjs         # report
 *   REVIEW_PASSWORD='...' node scripts/ensure-review-account.mjs --write # apply
 *
 * REVIEW_PASSWORD must match what App Store Connect shows under App Review
 * Information. It is never stored here — see the constant below.
 *
 * Database: the deployed site reads and writes `scriptura`, NOT the database
 * named in the local .env.local URI. Writing to the wrong one looks like a
 * success and changes nothing the app can see, so the target is pinned here
 * and overridable with MONGODB_DB rather than inherited from the URI.
 */

import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DB_NAME = process.env.MONGODB_DB ?? 'scriptura';
const EMAIL = process.env.REVIEW_EMAIL ?? 'applereview@mail.com';
const NAME = 'App Review';

// Never hardcoded: this repository is public, and the password grants a Pro
// account on the production database to anyone reading it. The value lives in
// App Store Connect under App Review Information, which is the only place it
// has to match.
const PASSWORD = process.env.REVIEW_PASSWORD;

// Cost factor 12, matching app/api/v1/auth/register/route.ts. A different
// factor still verifies, but keeping them equal means the demo account is
// byte-for-byte an ordinary account.
const BCRYPT_ROUNDS = 12;

// `subscribed` carries no expiry of its own, which is exactly what a review
// account wants: it cannot lapse in the middle of a review cycle.

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Not every environment has a dotenv file; the URI may come from the
      // environment directly.
    }
  }
}

async function main() {
  const write = process.argv.includes('--write');
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!PASSWORD) {
    throw new Error(
      'REVIEW_PASSWORD is not set. Use the password filed in App Store Connect ' +
        'under App Review Information, e.g. REVIEW_PASSWORD=... node scripts/ensure-review-account.mjs',
    );
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.client.db(DB_NAME).collection('users');
  console.log(`Database            : ${DB_NAME}`);

  const existing = await users.findOne({ email: EMAIL });

  if (existing) {
    const passwordOk = existing.password
      ? await bcrypt.compare(PASSWORD, existing.password)
      : false;
    console.log(`Account exists      : ${existing._id}`);
    console.log(`Password matches    : ${passwordOk}`);
    console.log(`subscribed (Pro)    : ${existing.subscribed === true}`);
    console.log(`storePremium        : ${existing.storePremium === true}`);
  } else {
    console.log(`Account exists      : no (${EMAIL} not found)`);
  }

  if (!write) {
    console.log('\nRead-only. Re-run with --write to create or repair.');
    await mongoose.disconnect();
    return;
  }

  const now = new Date();

  const result = await users.updateOne(
    { email: EMAIL },
    {
      $set: {
        name: NAME,
        password: await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS),
        subscribed: true,
        // Left explicitly false so the launch-time RevenueCat sync has nothing
        // to correct and never reports a contradiction.
        storePremium: false,
        storePremiumPlatform: null,
        storePremiumExpiresAt: null,
        // Never an admin: the review account should see exactly what a paying
        // user sees, not the admin surface.
        isAdmin: false,
        updatedAt: now,
      },
      $setOnInsert: {
        email: EMAIL,
        bio: '',
        streak: 0,
        freezeCount: 0,
        badges: [],
        xp: 0,
        level: 1,
        readChapters: {},
        createdAt: now,
      },
    },
    { upsert: true },
  );

  console.log(`\n${result.upsertedCount ? 'Created' : 'Repaired'} ${EMAIL}.`);

  // Prove it the same way the app does, rather than trusting the write.
  const check = await users.findOne({ email: EMAIL });
  console.log(`Verify password     : ${await bcrypt.compare(PASSWORD, check.password)}`);
  console.log(`Verify Pro          : ${check.subscribed === true}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
