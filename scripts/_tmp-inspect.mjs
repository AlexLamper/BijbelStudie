import fs from 'fs';
import mongoose from 'mongoose';
const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.split('\n').find(l => l.startsWith('MONGODB_URI='))?.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
await mongoose.connect(uri);
const db = mongoose.connection.db;
const g = await db.collection('studygroups').findOne({});
console.log('group:', JSON.stringify({ _id: g._id, name: g.name, isPublic: g.isPublic, inviteCode: g.inviteCode ? 'set' : 'none', createdBy: g.createdBy, members: g.members }, null, 1));
const creator = g.createdBy ? await db.collection('users').findOne({ _id: g.createdBy }, { projection: { email: 1, name: 1 } }) : null;
console.log('creator exists:', !!creator, creator?.email ?? '', creator?.name ?? '');
for (const m of g.members ?? []) {
  const u = await db.collection('users').findOne({ _id: m.userId }, { projection: { email: 1, name: 1 } });
  console.log('member:', m.role, u ? `${u.email} (${u.name})` : 'USER MISSING');
}
await mongoose.disconnect();
