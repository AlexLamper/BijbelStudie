/**
 * POST /api/admin/seed-group
 * Seeds a test bijbelstudiegroep, bypassing the subscription check.
 * Requires the user to be logged in. Safe to call multiple times (skips if already exists).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authOptions';
import connectMongoDB from '../../../../lib/mongodb';
import StudyGroup from '../../../../models/StudyGroup.js';
import User from '../../../../models/User.js';
import crypto from 'crypto';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const GROUP_NAME = 'Bijbelstudiegroep Scriptura';

    const existing = await StudyGroup.findOne({ name: GROUP_NAME });
    if (existing) {
      return NextResponse.json({
        message: 'SKIP: group already exists',
        inviteCode: existing.inviteCode,
        id: existing._id,
      });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await StudyGroup.create({
      name: GROUP_NAME,
      description: 'Een teststudiegroep voor Scriptura - lees de Bijbel samen en bespreek wat je leert.',
      isPublic: true,
      inviteCode,
      createdBy: user._id,
      members: [{ userId: user._id, role: 'leader', joinedAt: new Date() }],
    });

    return NextResponse.json({
      message: 'CREATED: group seeded',
      inviteCode: group.inviteCode,
      id: group._id,
    });
  } catch (err) {
    console.error('[seed-group]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
