import { type NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongoDB from '../../../../lib/mongodb';
import DeviceToken from '../../../../models/DeviceToken';
import { apnsConfig } from '../../../../lib/push/apns';
import { sendPushToUser } from '../../../../lib/push/send';
import { pickVariant } from '../../../../lib/notificationCopy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The one-off announcement broadcast.
 *
 * WHY A ROUTE AND NOT A SCRIPT. A script would need `MONGODB_URI` on a laptop,
 * which is the one thing CLAUDE.md's data-safety section says never to point at
 * production. This runs where the database already is, with the APNs key the
 * deployment already holds, and leaves a line in the Vercel log saying what it
 * did. It is deliberately NOT in `vercel.json` `crons`: an announcement that
 * fires on a schedule is a different and much worse product.
 *
 * DRY RUN BY DEFAULT. Without `?send=1` it counts the devices and returns the
 * copy that would go out, and touches nothing. That is the same opt-in shape as
 * app/api/internal/study-reminders.
 *
 * WHO GETS IT. Every reader with a live iOS device token for this deployment's
 * APNs environment. That is the whole audience there is: the owner rejected
 * Firebase, so Android has no push at all (models/DeviceToken.js), and the web
 * has no email sender (NOTIFICATIONS_PLAN.md §1.4). The notification therefore
 * reaches iPhone readers and asks them to pass the news on - which is also why
 * its copy is written that way (lib/notificationCopy.ts `ANNOUNCEMENT`).
 *
 * Holding a device token is the consent signal, and the only honest one here:
 * it means this reader granted iOS notification permission to this app. The
 * `preferences.reminderEnabled` flag is not consulted, because it is the toggle
 * for the daily reading reminder's schedule, not a global mute.
 *
 * IDEMPOTENCY, as far as APNs allows. Every send carries one `apns-collapse-id`
 * per announcement, so a second run replaces the first notification on the lock
 * screen instead of stacking a duplicate beside it. It cannot un-buzz a phone,
 * so the batching below reports `nextAfter` and the caller walks the list once
 * rather than re-running it from the start.
 */

/** The announcement to send. One id, so the collapse key is stable. */
const ANNOUNCEMENT_ID = 'a01';

/** Readers per call. One APNs request per device, sequentially, inside one lambda. */
const DEFAULT_BATCH = 200;
const MAX_BATCH = 500;

function isAuthorized(req: NextRequest, secrets: string[]): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = req.headers.get('x-cron-secret') ?? '';
  return secrets.some((secret) => bearer === secret || header === secret);
}

export async function POST(req: NextRequest) {
  const secrets = [process.env.ANNOUNCE_CRON_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => !!value,
  );

  if (secrets.length === 0) {
    console.error('[internal/announce] Missing ANNOUNCE_CRON_SECRET/CRON_SECRET; refusing to run');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!isAuthorized(req, secrets)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = apnsConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'APNs is niet geconfigureerd op deze deployment.' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  // Opt IN to sending, rather than opting out of it.
  const send = url.searchParams.get('send') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_BATCH, MAX_BATCH);
  const afterRaw = url.searchParams.get('after');
  if (afterRaw && !mongoose.Types.ObjectId.isValid(afterRaw)) {
    return NextResponse.json({ ok: false, error: 'Ongeldige `after`.' }, { status: 400 });
  }
  const after = afterRaw ? new mongoose.Types.ObjectId(afterRaw) : null;

  // The copy is the same for everyone - the pool holds one variant - so this is
  // rendered once and read back in the dry run rather than per reader.
  const rendered = pickVariant('announcement', {}, { seed: ANNOUNCEMENT_ID });

  try {
    const connection = await connectMongoDB();
    if (!connection) {
      return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 });
    }

    // One row per reader, in _id order, so `nextAfter` can resume where this
    // call stopped. Grouping on userId is what stops a reader with an iPhone
    // and an iPad from being counted twice; sendPushToUser fans out to both.
    const groups = await DeviceToken.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { platform: 'ios', environment: config.environment } },
      { $group: { _id: '$userId' } },
      ...(after ? [{ $match: { _id: { $gt: after } } }] : []),
      { $sort: { _id: 1 } },
      { $limit: limit },
    ]);

    const userIds = groups.map((row) => String(row._id));
    const totals = { devices: 0, sent: 0, deleted: 0, failed: 0 };

    if (send) {
      for (const userId of userIds) {
        const summary = await sendPushToUser(userId, 'announcement', rendered, {
          // Coarse on purpose: one key for the whole announcement, so a second
          // run replaces rather than stacks.
          collapseId: `announcement-${ANNOUNCEMENT_ID}`,
        });
        totals.devices += summary.devices;
        totals.sent += summary.sent;
        totals.deleted += summary.deleted;
        totals.failed += summary.failed;
      }
    }

    const body = {
      ok: true,
      dryRun: !send,
      announcementId: ANNOUNCEMENT_ID,
      environment: config.environment,
      copy: { title: rendered.title, body: rendered.body, deepLink: rendered.deepLink },
      readers: userIds.length,
      ...totals,
      nextAfter: userIds.length === limit ? userIds[userIds.length - 1] : null,
      ranAt: new Date().toISOString(),
    };

    console.log(
      `[internal/announce] ${ANNOUNCEMENT_ID} ${send ? 'verstuurd' : 'droogloop'}: ` +
        `${body.readers} lezers, ${totals.sent} verstuurd, ${totals.failed} mislukt, ` +
        `${totals.deleted} dode tokens opgeruimd`,
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error('[internal/announce] mislukt', error);
    return NextResponse.json({ ok: false, error: 'Broadcast failed' }, { status: 500 });
  }
}
