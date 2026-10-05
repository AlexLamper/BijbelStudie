import connectMongoDB from '../mongodb';
import DeviceToken from '../../models/DeviceToken';
import { apnsAuthToken, apnsConfig, isApnsConfigured, resetApnsAuthCache, sendApnsNotification } from './apns';
import { apnsPayloadFor, type NotificationType, type RenderedNotification } from '../notificationCopy';

/**
 * The one function the rest of the server calls to push something to a person.
 *
 * It takes a userId rather than a token because nothing upstream should know
 * that devices exist: a reader has a phone, maybe an iPad, maybe a phone they
 * sold last year, and which of those is still real is this module's problem.
 *
 * THE CONTRACT, and it is the whole reason this file is separate from apns.ts:
 * **`sendPushToUser` never throws and never rejects.** It is called from inside
 * a social write - a like, a comment, an accepted friend request - and the
 * write must not be able to fail because Apple had a bad minute or because
 * nobody set an APNs key on this deployment. Every failure is a field in the
 * returned summary and, where it is our fault, a line in the log. This is the
 * same arrangement `lib/friends/milestones.ts` uses for `postMilestone` and
 * that `grantXp` uses for `creditReferrerIfActivated`.
 *
 * The await is deliberate rather than a floating promise, for the same reason
 * as in milestones.ts: a Vercel lambda may be frozen the instant the response
 * is flushed, so a detached promise is a notification that sometimes never goes
 * out. "Fire and forget" here means the caller does not care whether it
 * succeeded, not that nobody waits for it.
 */

export type PushSendSummary = {
  /** False when this deployment has no APNs key. Nothing was attempted. */
  configured: boolean;
  /** Devices that were eligible for this message. */
  devices: number;
  sent: number;
  /** Tokens deleted because Apple said the device is gone. */
  deleted: number;
  failed: number;
};

const OFF: PushSendSummary = { configured: false, devices: 0, sent: 0, deleted: 0, failed: 0 };

/**
 * Inconclusive failures a token is allowed before it is dropped anyway.
 *
 * The conclusive answers (410, `Unregistered`, `BadDeviceToken`) delete at once.
 * This is for the other kind: a token that times out or 5xxs every single time
 * for a fortnight is not a device any more either, and leaving it in place is
 * how a fan-out slowly turns into a queue of failures.
 */
const MAX_FAILURES = 10;

/** How many devices one person's notification may fan out to. */
const MAX_DEVICES = 10;

/** Logged once per process, not once per notification. */
let warnedUnconfigured = false;

type TokenRow = {
  _id: unknown;
  token: string;
  failureCount?: number;
};

/**
 * Pushes one rendered notification to every live iOS device of one reader.
 *
 * `rendered` is whatever `pickVariant` produced, so the copy, the rotation and
 * the deep link are decided in lib/notificationCopy.ts and this file only
 * carries it.
 */
export async function sendPushToUser(
  userId: string,
  type: NotificationType,
  rendered: RenderedNotification,
  options: { collapseId?: string; badge?: number; eventId?: string } = {},
): Promise<PushSendSummary> {
  try {
    const config = apnsConfig();
    if (!config) {
      if (!warnedUnconfigured) {
        warnedUnconfigured = true;
        // Informational, not an error: a dev shell without an APNs key is a
        // supported state, exactly as a dev shell without FRIENDS_CONTACT_PEPPER
        // is. See .env.example.
        console.info('[push] APNs is niet geconfigureerd; pushmeldingen staan uit.');
      }
      return OFF;
    }

    await connectMongoDB();
    const rows = await DeviceToken.find({
      userId,
      platform: 'ios',
      // A sandbox token is rejected by the production host and vice versa, and
      // the rejection is `BadDeviceToken` - indistinguishable from a dead
      // device. Filtering here is what stops a production deploy from deleting
      // every developer's token (and a sandbox deploy from deleting every real
      // one).
      environment: config.environment,
    })
      .select('_id token failureCount')
      .sort({ lastSeenAt: -1 })
      .limit(MAX_DEVICES)
      .lean<TokenRow[]>();

    if (rows.length === 0) return { configured: true, devices: 0, sent: 0, deleted: 0, failed: 0 };

    const jwt = await apnsAuthToken(config);
    const payload = apnsPayloadFor(type, rendered, {
      badge: options.badge,
      eventId: options.eventId,
    });

    const summary: PushSendSummary = {
      configured: true,
      devices: rows.length,
      sent: 0,
      deleted: 0,
      failed: 0,
    };

    for (const row of rows) {
      const result = await sendApnsNotification({
        deviceToken: row.token,
        payload,
        config,
        jwt,
        collapseId: options.collapseId,
      });

      if (result.status === 200) {
        summary.sent += 1;
        // Only written when it was not already 0, so a healthy device's row is
        // not rewritten on every notification.
        if ((row.failureCount ?? 0) > 0) {
          await DeviceToken.updateOne({ token: row.token }, { $set: { failureCount: 0 } });
        }
        continue;
      }

      if (result.shouldDelete) {
        await DeviceToken.deleteOne({ token: row.token });
        summary.deleted += 1;
        continue;
      }

      summary.failed += 1;

      if (result.configError) {
        // Loud, and about us. A 403 from Apple is a wrong key id, a wrong team,
        // a .p8 that was pasted with its newlines mangled, or a topic that does
        // not match the bundle id - never anything the reader did. It is logged
        // as a configuration error precisely so it cannot be mistaken for the
        // ordinary background noise of dead tokens.
        console.error(
          `[push] APNs weigert onze gegevens (${result.status} ${result.reason ?? 'onbekend'}). ` +
            `Controleer APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID (${config.bundleId}) en APNS_P8.`,
        );
        // An expired provider token is the one 403 we can fix ourselves: drop
        // the cached JWT so the next send signs a new one.
        if (result.reason === 'ExpiredProviderToken') resetApnsAuthCache();
        // Our credentials are wrong for every device, not just this one.
        break;
      }

      await DeviceToken.updateOne({ token: row.token }, { $inc: { failureCount: 1 } });
      if ((row.failureCount ?? 0) + 1 >= MAX_FAILURES) {
        await DeviceToken.deleteOne({ token: row.token });
        summary.deleted += 1;
      }

      if (result.status === 429) {
        // Apple is telling us we are pushing this device too hard. Back off by
        // stopping here rather than retrying in-request: the social pull
        // endpoint will carry the event anyway, and a retry loop inside a
        // request that is about to end is how a lambda times out.
        break;
      }
    }

    return summary;
  } catch (error) {
    // The contract. Nothing from here reaches the caller.
    console.error(`[push] versturen mislukt voor ${userId}`, error);
    return { configured: isApnsConfiguredQuietly(), devices: 0, sent: 0, deleted: 0, failed: 0 };
  }
}

/** `isApnsConfigured` cannot throw, but the catch above must not be able to. */
function isApnsConfiguredQuietly(): boolean {
  try {
    return isApnsConfigured();
  } catch {
    return false;
  }
}

export { isApnsConfigured };
