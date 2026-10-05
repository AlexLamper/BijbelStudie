import connectMongoDB from '../mongodb';
import DeviceToken from '../../models/DeviceToken';
import type { ApnsEnvironment } from './apns';

/**
 * Registering and forgetting a device, kept out of the route handler so the
 * handler stays four lines (`requireUser`, parse, service, `jsonV1`) like
 * `app/api/v1/referral/route.ts`.
 */

export class PushError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'PushError';
    this.code = code;
    this.status = status;
  }
}

export type DevicePlatform = 'ios' | 'android';

export type DeviceRegistration = {
  token: string;
  platform: DevicePlatform;
  environment: ApnsEnvironment;
  bundleId?: string;
};

/**
 * An APNs device token is 32 bytes as 64 lowercase hex characters today. The
 * upper bound is loose because Apple has never promised the length, and a
 * stricter check would be a client-breaking surprise rather than a safety
 * property - nothing here interpolates the token into anything but a URL path
 * segment, and the hex class is what makes that safe.
 */
const TOKEN_PATTERN = /^[0-9a-f]{64,200}$/;

export function parseDeviceBody(body: unknown): DeviceRegistration {
  const input = (body ?? {}) as Record<string, unknown>;
  const token = typeof input.token === 'string' ? input.token.trim().toLowerCase() : '';
  if (!TOKEN_PATTERN.test(token)) {
    throw new PushError('INVALID_TOKEN', 400, 'Geen geldig apparaattoken.');
  }

  // `ios` by default: Android has no push in this product (the owner rejected
  // Firebase) and only ever polls GET /api/v1/notifications/social, so a row
  // with `android` would be written by a client that is ahead of the server.
  const platform: DevicePlatform = input.platform === 'android' ? 'android' : 'ios';

  // Stored, never guessed. A token minted by a debug build is valid only
  // against the sandbox host, and sending it to production comes back as
  // `BadDeviceToken` - which the sender would otherwise read as a dead device
  // and delete. The client knows which build it is; the server cannot.
  const environment: ApnsEnvironment = input.environment === 'sandbox' ? 'sandbox' : 'production';

  const bundleId =
    typeof input.bundleId === 'string' && input.bundleId.trim().length > 0
      ? input.bundleId.trim().slice(0, 200)
      : undefined;

  return { token, platform, environment, bundleId };
}

export type DeviceRegistrationResult = {
  ok: true;
  platform: DevicePlatform;
  environment: ApnsEnvironment;
};

/**
 * Register or refresh one device.
 *
 * Called on every app launch, not only the first: APNs rotates a token after a
 * restore, an OS upgrade or a reinstall, and `lastSeenAt` is what tells a dormant
 * device from a live one.
 *
 * The upsert is keyed on the **token**, not on the pair, which is the whole
 * point of the model: a phone that was sold carries its token to its new owner,
 * and the row has to move rather than being duplicated. Without that the
 * previous owner keeps receiving a stranger's vriendenkring until Apple happens
 * to invalidate the token.
 *
 * `failureCount` is reset: a device that is talking to us again is not a dead
 * one, whatever the last send thought.
 */
export async function registerDevice(
  userId: string,
  body: unknown,
  now = new Date(),
): Promise<DeviceRegistrationResult> {
  const input = parseDeviceBody(body);
  await connectMongoDB();

  await DeviceToken.updateOne(
    { token: input.token },
    {
      $set: {
        userId,
        platform: input.platform,
        environment: input.environment,
        ...(input.bundleId ? { bundleId: input.bundleId } : {}),
        lastSeenAt: now,
        failureCount: 0,
      },
      $setOnInsert: { token: input.token },
    },
    { upsert: true },
  );

  return { ok: true, platform: input.platform, environment: input.environment };
}

/**
 * Forget one device, on sign-out.
 *
 * Scoped to the caller: a token can only be removed by the account it is
 * currently registered to, so a leaked token is not a way to silence somebody
 * else's phone. Deleting something that is not there is a success - sign-out
 * must never fail, and a client that retries after a dropped response has to
 * get the same answer.
 */
export async function unregisterDevice(
  userId: string,
  body: unknown,
): Promise<{ ok: true; removed: number }> {
  const input = parseDeviceBody(body);
  await connectMongoDB();
  const result = await DeviceToken.deleteOne({ token: input.token, userId });
  return { ok: true, removed: result?.deletedCount ?? 0 };
}
