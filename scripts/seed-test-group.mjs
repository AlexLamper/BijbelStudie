/**
 * Seeds a public bijbelstudiegroep owned by ANOTHER user, so the primary
 * account can test the "Deelnemen" (join) flow on /groepen.
 *
 * Idempotent: re-running updates the existing group by name instead of
 * creating duplicates. Run:  node scripts/seed-test-group.mjs
 */
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';

const env = fs.readFileSync('.env.local', 'utf8');
const uri = env
  .split('\n')
  .find(l => l.startsWith('MONGODB_URI='))
  ?.slice('MONGODB_URI='.length)
  .trim()
  .replace(/^["']|["']$/g, '');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'info@bijbelstudie.io';
const GROUP_NAME = 'Testgroep - Samen door Markus';

await mongoose.connect(uri);
const db = mongoose.connection.db;

const owner = await db.collection('users').findOne({ email: OWNER_EMAIL });
if (!owner) {
  console.error(`No user with email ${OWNER_EMAIL} - pass OWNER_EMAIL=... to override.`);
  await mongoose.disconnect();
  process.exit(1);
}

const doc = {
  name: GROUP_NAME,
  description:
    'Openbare testgroep. Lees mee met Markus, bespreek de tekst en deel je notities. Iedereen mag deelnemen.',
  isPublic: true,
  createdBy: owner._id,
  members: [{ userId: owner._id, role: 'leader', joinedAt: new Date() }],
  weeklyAssignment: {
    book: 'Marcus',
    chapter: 1,
    title: 'Het begin van het evangelie',
    setBy: owner._id,
    setAt: new Date(),
    dueDate: null,
  },
  updatedAt: new Date(),
};

const existing = await db.collection('studygroups').findOne({ name: GROUP_NAME });
if (existing) {
  await db.collection('studygroups').updateOne({ _id: existing._id }, { $set: doc });
  console.log('UPDATED existing group', String(existing._id), '| invite', existing.inviteCode);
} else {
  const res = await db.collection('studygroups').insertOne({
    ...doc,
    inviteCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
    createdAt: new Date(),
  });
  console.log('CREATED group', String(res.insertedId));
}

const g = await db.collection('studygroups').findOne({ name: GROUP_NAME });
console.log(JSON.stringify({
  id: String(g._id),
  name: g.name,
  isPublic: g.isPublic,
  inviteCode: g.inviteCode,
  owner: OWNER_EMAIL,
  members: g.members.length,
}, null, 2));

await mongoose.disconnect();
