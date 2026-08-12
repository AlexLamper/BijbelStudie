import { GoogleGenAI } from '@google/genai';
import { requireUser } from '../../../../../lib/apiAuth';
import { corsPreflight, errorV1, handleV1Error, jsonV1 } from '../../../../../lib/apiV1';
import connectMongoDB from '../../../../../lib/mongodb';
import AiUsage from '../../../../../models/AiUsage';
import { getChapter } from '../../../../../lib/local-data';
import { buildSystemInstruction, formatChapterText } from '../../../../../lib/aiPrompt';
import { assertMobileAllowed } from '../../../../../lib/mobileLicensing';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsPreflight();
}

// Mirrors `/api/ai/chat` on the website: same model, same caps, same prompt.
const MODEL = 'gemini-flash-latest';
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

function isRateLimitError(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (e?.status === 429) return true;
  const msg = String(e?.message ?? err ?? '');
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
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

    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    let result;
    try {
      result = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(book, chapter, version, chapterText),
          temperature: 0.6,
          maxOutputTokens: 2500,
          thinkingConfig: { thinkingLevel: 'LOW' },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      } as Parameters<typeof ai.models.generateContent>[0]);
    } catch (err) {
      await refund();
      if (isRateLimitError(err)) {
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

    const reply = result.text;
    if (!reply || reply.trim().length === 0) {
      await refund();
      return jsonV1({ reply: BLOCKED_REPLY, used: newCount - 1, cap: unlimited ? null : cap });
    }

    return jsonV1({ reply, used: newCount, cap: unlimited ? null : cap });
  } catch (error) {
    return handleV1Error(error);
  }
}
