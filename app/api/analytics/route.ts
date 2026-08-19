import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import connectMongoDB from "../../../lib/mongodb";
import User from "../../../models/User";
import AnalyticsEvent from "../../../models/AnalyticsEvent";
import { isEventName, sanitizeProps } from "../../../lib/analyticsSchema";

/**
 * Funnel event sink. Necessarily reachable while logged out, because the
 * pricing page is public and the whole point is to measure visitors who have
 * not signed up yet.
 *
 * Everything that follows exists because this endpoint is unauthenticated:
 *  - event names and property values come from a fixed allowlist
 *    (lib/analyticsSchema.ts), so no client-chosen text is ever persisted;
 *  - the body is size-capped and the batch length capped, so it cannot be used
 *    to fill the database in one request;
 *  - a per-IP token bucket held in memory bounds sustained write volume;
 *  - the IP is used only for that bucket and is never written to Mongo;
 *  - userId is taken from the session on the server. A client-supplied user id
 *    is ignored outright, so events cannot be forged against another account.
 */

const MAX_BODY_BYTES = 8 * 1024;
const MAX_EVENTS_PER_REQUEST = 20;
const ANON_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

// Token bucket: 60 events per minute per IP. In-memory is the right scope here -
// it resets on deploy, which is acceptable for telemetry, and it avoids adding a
// Redis dependency for a non-critical path.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, cost: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: cost, resetAt: now + RATE_WINDOW_MS });
    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) {
        if (now > v.resetAt) buckets.delete(k);
      }
    }
    return false;
  }

  if (bucket.count + cost > RATE_LIMIT) return true;
  bucket.count += cost;
  return false;
}

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const incoming = Array.isArray(parsed) ? parsed : [parsed];
    if (incoming.length === 0) {
      return NextResponse.json({ accepted: 0 });
    }
    if (incoming.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json({ error: "Too many events" }, { status: 400 });
    }

    if (rateLimited(clientKey(req), incoming.length)) {
      // 204 rather than 429: telemetry must never surface an error to the user,
      // and a silent drop is the correct behaviour for an over-eager client.
      return new NextResponse(null, { status: 204 });
    }

    // Identity is resolved server-side only.
    const session = await getServerSession(authOptions);
    let userId: unknown = null;

    if (session?.user?.email) {
      await connectMongoDB();
      const user = await User.findOne({ email: session.user.email }).select("_id").lean();
      userId = (user as { _id?: unknown } | null)?._id ?? null;
    } else {
      await connectMongoDB();
    }

    const now = new Date();
    const docs = [];

    for (const item of incoming) {
      if (typeof item !== "object" || item === null) continue;

      const { name, props, anonId } = item as Record<string, unknown>;
      if (!isEventName(name)) continue;

      docs.push({
        name,
        userId,
        anonId: typeof anonId === "string" && ANON_ID_PATTERN.test(anonId) ? anonId : null,
        // `platform` is stamped here rather than trusted from the body: this
        // endpoint is only ever called by the website, and the mobile client
        // posts to /api/v1/analytics with its own platform. Doing it server-side
        // means every web call site gets it without having to remember, which is
        // what makes the ios/web funnels comparable. sanitizeProps drops it
        // again for the events that do not declare a platform property.
        props: sanitizeProps(name, {
          ...(typeof props === "object" && props !== null && !Array.isArray(props) ? props : {}),
          platform: "web",
        }),
        occurredAt: now,
      });
    }

    if (docs.length > 0) {
      // `ordered: false` so one bad document cannot discard the rest of a batch.
      await AnalyticsEvent.insertMany(docs, { ordered: false });
    }

    return NextResponse.json({ accepted: docs.length });
  } catch (error) {
    // Telemetry failures must never break a user flow, so this always reports
    // success to the client and only records the problem server-side.
    console.error("[analytics] Failed to record events:", error);
    return new NextResponse(null, { status: 204 });
  }
}
