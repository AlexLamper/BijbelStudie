import { requireUser } from '../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../lib/apiV1';
import connectMongoDB from '../../../../lib/mongodb';
import Feedback from '../../../../models/Feedback';
import { consume } from '../../../../lib/rateLimit';
import { detectMobilePlatform } from '../../../../lib/mobilePlatform';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

const CATEGORIES = ['bug', 'feature', 'praise', 'other'] as const;

/** 20 per account per day - the same budget as the web route (`app/api/feedback/route.ts`). */
const PER_USER = { scope: 'feedback:user', limit: 20, windowMs: 24 * 60 * 60 * 1000 };
const MAX_BODY_BYTES = 16 * 1024;
const MAX_APP_VERSION_LENGTH = 40;

/** `context.platform`'s enum in `models/Feedback.js`, minus the null. */
const PLATFORMS = ['web', 'ios', 'android'] as const;
type FeedbackPlatform = (typeof PLATFORMS)[number];

/**
 * Touchpoints a caller of this route may name. The app's feedback sheet is
 * the unprompted form; every prompted touchpoint needs server-side context
 * this route does not compute, so anything else falls back to "unprompted".
 */
const ALLOWED_TOUCHPOINTS = new Set(['unprompted']);

function asPlatform(value: unknown): FeedbackPlatform | null {
  if (typeof value !== 'string') return null;
  const lower = value.trim().toLowerCase();
  return (PLATFORMS as readonly string[]).includes(lower) ? (lower as FeedbackPlatform) : null;
}

/**
 * Which platform the report came from: an explicit body field or header when
 * the app sends one, otherwise whatever the user agent gives away. Null rather
 * than a guess - the Flutter HTTP client's default agent names no OS.
 */
function resolvePlatform(req: Request, body: Record<string, unknown>): FeedbackPlatform | null {
  const explicit =
    asPlatform(body.platform) ??
    asPlatform(req.headers.get('x-platform')) ??
    asPlatform(req.headers.get('x-app-platform'));
  if (explicit) return explicit;
  const { os } = detectMobilePlatform(req.headers.get('user-agent') ?? '');
  return os === 'other' ? null : os;
}

/** A version string such as "1.4.2+37"; anything else is dropped. */
function resolveAppVersion(req: Request, body: Record<string, unknown>): string | null {
  const candidates = [body.appVersion, req.headers.get('x-app-version')];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim().slice(0, MAX_APP_VERSION_LENGTH);
    if (/^[0-9A-Za-z.+_-]+$/.test(trimmed)) return trimmed;
  }
  return null;
}

/**
 * In-app feedback, landing in the same collection the admin console reads.
 * `page` carries the app route so a report says where it came from, and
 * `context.platform` / `context.appVersion` say which build sent it.
 *
 * Every caller here is already authenticated (`requireUser` requires a bearer
 * token), so there is no honeypot and no anonymous name/email path to worry
 * about - identity is always the account behind the token. It shares the same
 * per-account budget as the web form via `lib/rateLimit.ts`.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);

    const declaredLength = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return errorV1('PAYLOAD_TOO_LARGE', 413, 'Bericht is te lang');
    }

    if (consume(PER_USER, auth.id).limited) {
      return errorV1('RATE_LIMITED', 429, 'Je hebt vandaag al veel feedback gestuurd. Bedankt - morgen weer.');
    }

    // The declared length is only a hint (a chunked body has none), so the
    // actual text is measured too before it is parsed.
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return errorV1('PAYLOAD_TOO_LARGE', 413, 'Bericht is te lang');
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return errorV1('INVALID_JSON', 400, 'Ongeldige JSON');
    }

    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      return errorV1('MISSING_FIELDS', 400, 'message is required');
    }

    const category = (CATEGORIES as readonly unknown[]).includes(body.category)
      ? (body.category as (typeof CATEGORIES)[number])
      : 'other';
    const rating =
      typeof body.rating === 'number' && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
        ? body.rating
        : undefined;
    const touchpoint =
      typeof body.touchpoint === 'string' && ALLOWED_TOUCHPOINTS.has(body.touchpoint)
        ? body.touchpoint
        : 'unprompted';

    await connectMongoDB();
    const doc = await Feedback.create({
      userId: auth.id,
      name: auth.name,
      email: auth.email,
      category,
      rating,
      message: body.message.trim().slice(0, 4000),
      page: typeof body.page === 'string' ? body.page.slice(0, 200) : 'app',
      userAgent: (req.headers.get('user-agent') ?? 'BijbelStudie app').slice(0, 500),
      touchpoint,
      context: {
        platform: resolvePlatform(req, body),
        appVersion: resolveAppVersion(req, body),
      },
    });

    return jsonV1({ id: doc._id.toString() }, { status: 201 });
  } catch (error) {
    return handleV1Error(error);
  }
}
