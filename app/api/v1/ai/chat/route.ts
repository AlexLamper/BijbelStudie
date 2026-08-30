import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import AiUsage from '../../../../../models/AiUsage';
import { getChapter } from '../../../../../lib/local-data';
import { buildSystemInstruction, formatChapterText } from '../../../../../lib/aiPrompt';
import { assertMobileAllowed } from '../../../../../lib/mobileLicensing';
import {
  AiBusyError,
  generateChatReply,
  isRateLimitError,
  type AiTurn,
} from '../../../../../lib/aiGemini';
import {
  isCacheable,
  readCachedAnswer,
  writeCachedAnswer,
  type CacheContext,
} from '../../../../../lib/aiAnswerCache';
import {
  refundAiReservation,
  reserveAiSpend,
  settleAiSpend,
} from '../../../../../lib/aiBudget';

export const dynamic = 'force-dynamic';

/**
 * Same 60s ceiling as `/api/ai/chat` on the website, and for the same reason:
 * a slow answer is `generateChatReply` walking its fallback chain, which
 * outlasts the platform default. Without this the function was killed
 * mid-flight and the app saw a dropped connection instead of the AI_BUSY state
 * it knows how to explain - so the mobile assistant failed on exactly the calls
 * the website handled fine. 60s is the limit on every Vercel plan.
 */
export const maxDuration = 60;

export async function OPTIONS() {
  return corsPreflight();
}

// Mirrors `/api/ai/chat` on the website: same model, same caps, same prompt.
const FREE_DAILY_CAP = 5;
const PREMIUM_DAILY_CAP = 200;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_ITEM_LENGTH = 4000;

const BLOCKED_REPLY =
  'Ik kan deze vraag helaas niet beantwoorden. Stel gerust een andere vraag over de Bijbel of het geloof.';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

function currentDay(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.slice(0, MAX_HISTORY_ITEM_LENGTH),
    }));
}

/** Remaining quota, so the composer can show "3 van 5 vragen over". */
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    await connectMongoDB();

    const unlimited = auth.isPro || auth.isAdmin;
    const cap = unlimited ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;

    const doc = await AiUsage.findOne({ userId: auth.id, day: currentDay() }).lean<{
      count: number;
    }>();

    return jsonV1({
      configured: !!process.env.GEMINI_API_KEY,
      used: doc?.count ?? 0,
      cap,
      unlimited,
    });
  } catch (error) {
    return handleV1Error(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return errorV1('AI_NOT_CONFIGURED', 503, 'AI-assistent niet geconfigureerd');

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return errorV1('MISSING_MESSAGE', 400, 'Bericht ontbreekt');
    }

    const message: string = body.message.trim();
    if (message.length > MAX_MESSAGE_LENGTH) {
      return errorV1('MESSAGE_TOO_LONG', 413, `Bericht te lang (max ${MAX_MESSAGE_LENGTH} tekens)`);
    }

    const history = sanitizeHistory(body.history);

    const book: string | null =
      typeof body.book === 'string' && body.book.length > 0 && body.book.length <= 60
        ? body.book
        : null;
    const chapter: number | null =
      Number.isInteger(body.chapter) && body.chapter >= 1 && body.chapter <= 200
        ? body.chapter
        : null;
    const version: string | null =
      typeof body.version === 'string' && body.version.length > 0 && body.version.length <= 60
        ? body.version
        : null;

    // A blocked translation must not reach the app even as prompt context.
    if (version) assertMobileAllowed('bible', version);

    await connectMongoDB();

    const unlimited = auth.isPro || auth.isAdmin;
    const cap = unlimited ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;

    // Atomic quota increment before the model call, refunded on any failure.
    const day = currentDay();
    const updated = await AiUsage.findOneAndUpdate(
      { userId: auth.id, day },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    ).lean<{ count: number }>();
    const newCount = updated?.count ?? 1;
    const refund = () => AiUsage.updateOne({ userId: auth.id, day }, { $inc: { count: -1 } });

    if (newCount > cap) {
      await refund();
      return jsonV1(
        {
          error: 'QUOTA_EXCEEDED',
          message: unlimited
            ? 'Dagelijkse limiet bereikt. Probeer het morgen opnieuw.'
            : `Je hebt je ${FREE_DAILY_CAP} gratis vragen voor vandaag gebruikt.`,
          used: newCount - 1,
          cap,
        },
        { status: 429 },
      );
    }

    // A cache hit costs no Gemini quota, which is the scarce resource. The
    // user's own daily count is still spent, so the advertised cap holds.
    const cacheCtx: CacheContext = { question: message, book, chapter, version };
    const cacheable = isCacheable(message, history.length);
    if (cacheable) {
      const cached = await readCachedAnswer(cacheCtx);
      if (cached) {
        return jsonV1({ reply: cached, used: newCount, cap: unlimited ? null : cap, cached: true });
      }
    }

    // The same application-wide ceiling the website route claims against. This
    // is the second door onto the provider, and a guard that only covers one of
    // them is not a ceiling - the app would simply spend through this one.
    const reservation = await reserveAiSpend();
    if (!reservation.allowed) {
      await refund();
      console.warn(
        `[api/v1/ai/chat] Budget guard refused a call (${reservation.reason}) - month ${reservation.month}`,
      );
      return jsonV1(
        {
          error: 'AI_BUDGET_EXHAUSTED',
          message:
            reservation.reason === 'LEDGER_UNAVAILABLE'
              ? 'De AI-assistent is nu even niet beschikbaar. Probeer het zo opnieuw.'
              : 'De AI-assistent is deze maand tijdelijk uitgeschakeld. Probeer het volgende maand opnieuw.',
        },
        { status: 503 },
      );
    }

    let chapterText: string | null = null;
    if (book && chapter && version) {
      try {
        const data = await getChapter(version, book, chapter);
        if (data && 'verses' in data && data.verses && !Array.isArray(data.verses)) {
          chapterText = formatChapterText(data.verses as Record<string, string>);
        }
      } catch {
        // proceed without context
      }
    }

    const contents: AiTurn[] = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    let reply: string | undefined;
    let model: string | null = null;
    try {
      const generated = await generateChatReply({
        apiKey,
        contents,
        systemInstruction: buildSystemInstruction(book, chapter, version, chapterText),
      });
      reply = generated.text;
      model = generated.model;
      await settleAiSpend(generated.usage.inputTokens, generated.usage.outputTokens);
    } catch (err) {
      await refund();
      await refundAiReservation();
      // A capacity blip that survived every retry reads the same to the app as
      // a rate limit: come back in a minute.
      if (err instanceof AiBusyError || isRateLimitError(err)) {
        return jsonV1(
          {
            error: 'AI_BUSY',
            message: 'Het is momenteel erg druk. Probeer het over een minuutje opnieuw.',
          },
          { status: 429 },
        );
      }
      console.error('[api/v1/ai/chat] Gemini error:', err);
      return errorV1('AI_CALL_FAILED', 502, 'AI-aanroep mislukt');
    }

    if (!reply || reply.trim().length === 0) {
      // The user's question is refunded; the budget is not. Those tokens were
      // billed whether or not the candidate survived the safety filter.
      await refund();
      return jsonV1({ reply: BLOCKED_REPLY, used: newCount - 1, cap: unlimited ? null : cap });
    }

    if (cacheable) await writeCachedAnswer(cacheCtx, reply, model);

    return jsonV1({ reply, used: newCount, cap: unlimited ? null : cap });
  } catch (error) {
    return handleV1Error(error);
  }
}
