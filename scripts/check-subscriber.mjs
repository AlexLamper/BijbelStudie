/**
 * Verify that one paying customer was provisioned correctly.
 *
 *   node scripts/check-subscriber.mjs <email>
 *
 * Reads the account from MongoDB, reads the truth from Stripe, and reports every
 * way the two can disagree. Written for the question an owner actually asks
 * after a payment lands - "did that work?" - which no single dashboard answers:
 * Stripe knows the money arrived, the database decides whether the person gets
 * anything for it, and the interesting failures are exactly the cases where
 * those two disagree because a webhook never landed.
 *
 * ENVIRONMENT. It uses the ambient MONGODB_URI / STRIPE_SECRET_KEY when they are
 * set, and only falls back to .env.local otherwise. That order matters: .env.local
 * on a dev machine points at a test cluster and an sk_test_ key, so running this
 * without thinking would cheerfully report "no such user" about a real customer
 * who is fine. It prints which host and which Stripe mode it is talking to
 * before anything else, and refuses to look quietly wrong.
 *
 * Read-only. It never writes to either system.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Stripe from 'stripe';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Gebruik: node scripts/check-subscriber.mjs <email>');
  process.exit(1);
}

// Ambient environment wins; .env.local is the fallback for local runs.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const uri = process.env.MONGODB_URI;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!uri) {
  console.error('MONGODB_URI ontbreekt.');
  process.exit(1);
}

const host = (uri.match(/@([^/]+)\//) || [])[1] || '(onbekend)';
const dbName = (uri.match(/\/([^/?]+)\?/) || [])[1] || '(standaard)';
const stripeMode = stripeKey?.startsWith('sk_live_')
  ? 'LIVE'
  : stripeKey?.startsWith('sk_test_')
    ? 'TEST'
    : '(geen sleutel)';

console.log('─'.repeat(64));
console.log('Database :', dbName, 'op', host.split(',')[0]);
console.log('Stripe   :', stripeMode);
console.log('Account  :', email);
console.log('─'.repeat(64));
if (stripeMode === 'TEST') {
  console.log('LET OP: testmodus. Een echte betaling staat hier niet in.\n');
}

const problems = [];
const notes = [];

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
const users = mongoose.connection.db.collection('users');

// Case-insensitive: the schema lowercases on write, but documents created before
// that was added can still carry mixed case.
const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const user = await users.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } });

if (!user) {
  console.log('DATABASE: geen account met dit e-mailadres.\n');
  problems.push(
    'Er is geen account met dit e-mailadres. Betaald zonder account, of met een ander adres afgerekend dan waarmee is ingelogd.',
  );
} else {
  const period = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
  const daysLeft = period ? Math.round((period - Date.now()) / 86400000) : null;

  console.log('DATABASE');
  console.log('  naam                 :', user.name ?? '(leeg)');
  console.log('  aangemaakt           :', user.createdAt?.toISOString?.() ?? '(onbekend)');
  console.log('  subscribed           :', user.subscribed === true);
  console.log('  subscriptionStatus   :', user.subscriptionStatus ?? '(leeg)');
  console.log('  subscriptionInterval :', user.subscriptionInterval ?? '(leeg)');
  console.log('  stripeCustomerId     :', user.stripeCustomerId ? 'gezet' : 'ONTBREEKT');
  console.log('  stripeSubscriptionId :', user.stripeSubscriptionId ? 'gezet' : 'ONTBREEKT');
  console.log('  currentPeriodEnd     :', period ? `${period.toISOString()} (${daysLeft} dagen)` : '(leeg)');
  console.log('  cancelAtPeriodEnd    :', user.cancelAtPeriodEnd === true);
  console.log('  billingIssueSince    :', user.billingIssueSince ?? '(geen)');
  console.log('  pausedUntil          :', user.pausedUntil ?? '(geen)');
  console.log('  wachtwoord ingesteld :', user.password ? 'ja' : 'nee (OAuth-login)');
  console.log('  isAdmin              :', user.isAdmin === true);
  console.log('');

  // `subscribed` is the flag the whole site gates Pro on (lib/mobilePremium.ts
  // ORs it with storePremium and admin). Everything else here is diagnosis; this
  // one line is whether the customer actually got what they paid for.
  if (user.subscribed !== true) {
    problems.push('`subscribed` staat op false: de klant heeft GEEN Pro-toegang.');
  }
  if (!['active', 'trialing'].includes(user.subscriptionStatus)) {
    problems.push(`subscriptionStatus is "${user.subscriptionStatus ?? 'leeg'}", niet active/trialing.`);
  }
  if (user.subscriptionInterval !== 'annual') {
    problems.push(
      `subscriptionInterval is "${user.subscriptionInterval ?? 'leeg'}" terwijl er voor een jaarplan is betaald.`,
    );
  }
  if (!user.stripeCustomerId) {
    problems.push('stripeCustomerId ontbreekt: het account is niet aan Stripe gekoppeld.');
  }
  if (!user.stripeSubscriptionId) {
    problems.push('stripeSubscriptionId ontbreekt: de webhook heeft het abonnement nooit weggeschreven.');
  }
  if (period && daysLeft !== null && daysLeft < 300) {
    notes.push(`currentPeriodEnd ligt over ${daysLeft} dagen - kort voor een jaarabonnement.`);
  }
  if (user.cancelAtPeriodEnd === true) {
    notes.push('cancelAtPeriodEnd staat aan: er is al opgezegd tegen het einde van de periode.');
  }
  if (user.billingIssueSince) {
    problems.push('billingIssueSince is gezet: er staat een mislukte betaling open.');
  }
  if (
    process.env.STRIPE_ANNUAL_PRICE_ID &&
    user.stripePriceId &&
    user.stripePriceId !== process.env.STRIPE_ANNUAL_PRICE_ID
  ) {
    notes.push(
      user.stripePriceId === process.env.STRIPE_PRICE_ID
        ? 'stripePriceId is het MAANDplan, niet het jaarplan.'
        : 'stripePriceId komt niet overeen met het jaarplan uit de omgeving.',
    );
  }
}

if (stripeKey) {
  const stripe = new Stripe(stripeKey);
  console.log('STRIPE');

  const found = await stripe.customers.search({
    query: `email:"${email}"`,
    limit: 10,
  });

  if (found.data.length === 0) {
    console.log('  geen klant met dit e-mailadres.\n');
    problems.push('Stripe kent geen klant met dit e-mailadres - de betaling staat op een ander adres.');
  } else {
    for (const customer of found.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10,
      });
      console.log(`  klant ${customer.id} (${customer.email})`);
      if (subs.data.length === 0) {
        console.log('    geen abonnementen.');
        problems.push(`Stripe-klant ${customer.id} heeft geen abonnement.`);
      }
      for (const sub of subs.data) {
        const item = sub.items.data[0];
        const interval = item?.price?.recurring?.interval ?? '?';
        const amount = item?.price?.unit_amount != null ? item.price.unit_amount / 100 : '?';
        const end = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : '(onbekend)';
        console.log(
          `    ${sub.id}  status=${sub.status}  ${interval}  ${amount} ${(item?.price?.currency ?? '').toUpperCase()}  tot ${end}  cancelAtPeriodEnd=${sub.cancel_at_period_end}`,
        );

        if (user && sub.status === 'active') {
          if (user.stripeCustomerId && user.stripeCustomerId !== customer.id) {
            problems.push(
              `Het account wijst naar een andere Stripe-klant dan degene die betaald heeft (${user.stripeCustomerId} vs ${customer.id}).`,
            );
          }
          if (user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id) {
            notes.push(
              `Opgeslagen abonnement-id wijkt af van het actieve abonnement (${user.stripeSubscriptionId} vs ${sub.id}).`,
            );
          }
          if (interval === 'year' && user.subscriptionInterval !== 'annual') {
            problems.push('Stripe zegt jaarabonnement, de database zegt iets anders.');
          }
        }
      }
    }
    console.log('');
  }
} else {
  notes.push('Geen STRIPE_SECRET_KEY: alleen de database is gecontroleerd.');
}

console.log('─'.repeat(64));
if (problems.length === 0) {
  console.log('RESULTAAT: in orde. De klant heeft Pro-toegang.');
} else {
  console.log('RESULTAAT: er is iets mis.');
  for (const problem of problems) console.log('  ✗', problem);
  console.log('');
  console.log('  Herstel: open /admin/users, zoek het account en kies "Reconcile"');
  console.log('  in het menu. Dat leest de stand opnieuw uit Stripe en schrijft');
  console.log('  hem weg (app/api/admin/reconcile-subscriptions).');
}
for (const note of notes) console.log('  •', note);
console.log('─'.repeat(64));

await mongoose.disconnect();
