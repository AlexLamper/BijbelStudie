import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import AnalyticsEvent from '../../../../models/AnalyticsEvent';
import { isEventName, sanitizeProps } from '../../../../lib/analyticsSchema';

/**
 * Funnel events from the mobile app.
 *
 * The web sink at /api/analytics authenticates with a NextAuth session cookie,
 * which the Flutter client does not have - it carries a bearer JWT. Rather than
 * loosening the web route's auth, the mobile surface gets its own endpoint on
 * the /api/v1 contract it already speaks.
 *
 * The security model is the shared one: event names and every property value
 * come from the fixed allowlist in lib/analyticsSchema.ts, so no client-chosen
 * text is ever persisted. Unlike the web route this one requires a valid user,
 * so there is no anonymous write path and no need for IP rate limiting.
 */

export const dynamic = 'force-dynamic';

const MAX_EVENTS_PER_REQUEST = 20;

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);

    const body = await req.json().catch(() => null);
    const incoming = Array.isArray(body) ? body : [body];

    if (incoming.length === 0 || incoming[0] === null) {
      return jsonV1({ accepted: 0 });
    }
    if (incoming.length > MAX_EVENTS_PER_REQUEST) {
      return jsonV1({ error: 'TOO_MANY_EVENTS' }, { status: 400 });
    }

    await connectMongoDB();

    const now = new Date();
    const docs = [];

    for (const item of incoming) {
      if (typeof item !== 'object' || item === null) continue;
      const { name, props } = item as Record<string, unknown>;
      if (!isEventName(name)) continue;

      docs.push({
        name,
        // Identity comes from the verified token, never from the payload.
        userId: auth.id,
        anonId: null,
        props: sanitizeProps(name, props),
        occurredAt: now,
      });
    }

    if (docs.length > 0) {
      await AnalyticsEvent.insertMany(docs, { ordered: false });
    }

    return jsonV1({ accepted: docs.length });
  } catch (error) {
    return handleV1Error(error);
  }
}
