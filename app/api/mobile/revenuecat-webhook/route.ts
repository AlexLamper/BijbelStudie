import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import connectMongoDB from '../../../../lib/mongodb';
import WebhookEvent from '../../../../models/WebhookEvent';
import { syncStorePremiumForAppUser } from '../../../../lib/revenuecatSync';

export const runtime = 'nodejs';
// The raw body is needed byte-for-byte for the optional HMAC check, so the
// body is read as text and parsed by hand rather than by a body parser.
export const dynamic = 'force-dynamic';

/**
 * POST /api/mobile/revenuecat-webhook
 *
 * Authentication: RevenueCat's webhook feature sends a static value in the
 * `Authorization` header that you set in their dashboard - it does not sign
 * the body. So the primary check is an exact match against
 * REVENUECAT_WEBHOOK_AUTHORIZATION.
 *
 * If REVENUECAT_WEBHOOK_SECRET is also set, an `x-revenuecat-signature` header
 * is additionally verified as HMAC-SHA256 over the raw body. That covers a
 * signing proxy in front of this route; with plain RevenueCat the header is
 * absent and the check is skipped.
 *
 * Idempotency: RevenueCat retries. The event id is inserted first and a
 * duplicate-key error is the signal that this delivery was already handled.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  if (expectedAuth) {
    const provided = req.headers.get('authorization') ?? '';
    if (!safeEqual(provided, expectedAuth)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (!process.env.REVENUECAT_WEBHOOK_SECRET) {
    // Refuse to run wide open. An unauthenticated endpoint that flips
    // entitlements is a free Pro subscription for anyone who finds the URL.
    console.error(
      'revenuecat-webhook: neither REVENUECAT_WEBHOOK_AUTHORIZATION nor REVENUECAT_WEBHOOK_SECRET is set',
    );
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const signature = req.headers.get('x-revenuecat-signature');
  if (secret && signature) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(signature, expected)) {
      return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const root = body as { event?: Record<string, unknown> };
  const event = (root.event ?? body) as {
    id?: string;
    type?: string;
    app_user_id?: string;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
    store?: string | null;
  };

  if (!event.id || !event.app_user_id) {
    return NextResponse.json({ error: 'Missing event.id or app_user_id' }, { status: 400 });
  }

  await connectMongoDB();

  try {
    await WebhookEvent.create({
      provider: 'revenuecat',
      eventId: event.id,
      payloadSummary: String(event.type ?? '').slice(0, 200),
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw e;
  }

  try {
    await syncStorePremiumForAppUser(event.app_user_id, event);
  } catch (e) {
    console.error('revenuecat-webhook: entitlement sync failed:', e);
    // 500 so RevenueCat retries. The ledger row is already written, so the
    // retry would be swallowed as a duplicate - remove it first.
    await WebhookEvent.deleteOne({ provider: 'revenuecat', eventId: event.id });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
