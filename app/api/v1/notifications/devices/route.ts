import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import { checkRateLimit } from '../../../../../lib/mobileRateLimit';
import { PushError, registerDevice, unregisterDevice } from '../../../../../lib/push/devices';
import { isApnsConfigured } from '../../../../../lib/push/apns';

/**
 * `node:http2` is reachable from this route through lib/push, and the Edge
 * runtime has no such module - that failure would be a build-time resolution
 * error, not something a try/catch could reach. Nothing in next.config.ts sets
 * a default runtime, so an App Router handler is Node.js unless it says
 * otherwise; this is stated rather than inherited, because the default is the
 * kind of thing a later config change takes away quietly.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE = { headers: { 'Cache-Control': 'private, no-store' } };

function handlePushError(error: unknown) {
  if (error instanceof PushError) return errorV1(error.code, error.status, error.message);
  return handleV1Error(error);
}

export async function OPTIONS() {
  return corsPreflight();
}

/**
 * POST /api/v1/notifications/devices
 *
 * Register or refresh this device's APNs token. Called on every launch once the
 * reader has granted permission, because Apple rotates the token after a
 * restore, an OS upgrade or a reinstall.
 *
 * 503 when this deployment has no APNs key, on the same precedent as
 * `GET /api/v1/friends/discovery/pepper`: the feature is simply off, and
 * pretending to accept a token for a server that can never send to it would
 * leave the app waiting for notifications that cannot arrive. The app reads the
 * 503 as "no push here, keep using local notifications and the social poll".
 * Nothing is lost by refusing - the app re-registers on the next launch, so
 * turning APNs on later needs no app release.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if (!isApnsConfigured()) {
      return errorV1('PUSH_NOT_CONFIGURED', 503, 'Pushmeldingen staan hier uit.');
    }
    // Generous, because a legitimate client calls this once per launch: this is
    // a guard against a loop in a client, not against abuse.
    const limit = checkRateLimit(`push:register:${auth.id}`, 60, 60 * 60);
    if (!limit.allowed) {
      return errorV1('RATE_LIMITED', 429, 'Te veel registraties. Probeer het later opnieuw.');
    }
    const body = await readBody(req);
    return jsonV1(await registerDevice(auth.id, body), PRIVATE);
  } catch (error) {
    return handlePushError(error);
  }
}

/**
 * DELETE /api/v1/notifications/devices
 *
 * Forget this device, on sign-out. Not gated on APNs being configured: a token
 * already on file has to be removable whatever the server can or cannot send,
 * and a sign-out that fails is worse than a sign-out that deletes nothing.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    const body = await readBody(req);
    return jsonV1(await unregisterDevice(auth.id, body), PRIVATE);
  } catch (error) {
    return handlePushError(error);
  }
}

/** A body that is absent or not JSON is an empty object, not a 500. */
async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
