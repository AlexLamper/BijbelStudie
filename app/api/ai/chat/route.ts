import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import AiUsage from "../../../../models/AiUsage";
import { isAdminEmail } from "../../../../lib/adminEmails";
import { getChapter } from "../../../../lib/local-data";
import { buildSystemInstruction, formatChapterText } from "../../../../lib/aiPrompt";
import {
  AiBusyError,
  generateChatReply,
  isRateLimitError,
  type AiTurn,
} from "../../../../lib/aiGemini";
import {
  isCacheable,
  readCachedAnswer,
  writeCachedAnswer,
  type CacheContext,
} from "../../../../lib/aiAnswerCache";

const FREE_DAILY_CAP = 5;
const PREMIUM_DAILY_CAP = 200; // soft anti-abuse cap for Pro/admin
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_ITEM_LENGTH = 4000;

const BLOCKED_REPLY =
  "Ik kan deze vraag helaas niet beantwoorden. Stel gerust een andere vraag over de Bijbel of het geloof.";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function currentDay(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_HISTORY_ITEM_LENGTH),
    }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet geauthenticeerd" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI-assistent niet geconfigureerd" }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
      return NextResponse.json({ error: "Bericht ontbreekt" }, { status: 400 });
    }
    const message: string = body.message.trim();
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Bericht te lang (max ${MAX_MESSAGE_LENGTH} tekens)` },
        { status: 413 },
      );
    }

    const history = sanitizeHistory(body.history);

    // Reading context is best-effort; invalid values are simply ignored.
    const book: string | null =
      typeof body.book === "string" && body.book.length > 0 && body.book.length <= 60
        ? body.book
        : null;
    const chapter: number | null =
      Number.isInteger(body.chapter) && body.chapter >= 1 && body.chapter <= 200
        ? body.chapter
        : null;
    const version: string | null =
      typeof body.version === "string" && body.version.length > 0 && body.version.length <= 60
        ? body.version
        : null;

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email }).lean<{
      _id: unknown;
      subscribed?: boolean;
      isAdmin?: boolean;
    }>();
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    // Server-side premium check (mirrors authOptions session callback).
    const unlimited = !!user.subscribed || !!user.isAdmin || isAdminEmail(session.user.email);
    const cap = unlimited ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;

    // ── Atomic quota increment (before the Gemini call) ─────────────
    const day = currentDay();
    const updated = await AiUsage.findOneAndUpdate(
      { userId: user._id, day },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    ).lean<{ count: number }>();
    const newCount = updated?.count ?? 1;

    const refund = () => AiUsage.updateOne({ userId: user._id, day }, { $inc: { count: -1 } });

    if (newCount > cap) {
      await refund();
      return NextResponse.json(
        {
          error: unlimited
            ? "Dagelijkse limiet bereikt. Probeer het morgen opnieuw."
            : `Je hebt je ${FREE_DAILY_CAP} gratis vragen voor vandaag gebruikt.`,
          code: "QUOTA_EXCEEDED",
          used: newCount - 1,
          cap,
          hint: unlimited
            ? undefined
            : `Morgen kun je weer ${FREE_DAILY_CAP} vragen stellen, of upgrade naar Pro voor onbeperkt gebruik.`,
        },
        { status: 429 },
      );
    }

    // ── Cache lookup ───────────────────────────────────────────────
    // A hit costs no Gemini quota, which is the scarce resource. The user's own
    // daily count is still spent, so the advertised cap keeps its meaning.
    const cacheCtx: CacheContext = { question: message, book, chapter, version };
    const cacheable = isCacheable(message, history.length);
    if (cacheable) {
      const cached = await readCachedAnswer(cacheCtx);
      if (cached) {
        return NextResponse.json({
          reply: cached,
          used: newCount,
          cap: unlimited ? null : cap,
          cached: true,
        });
      }
    }

    // ── Chapter context (best-effort, never fails the request) ─────
    let chapterText: string | null = null;
    if (book && chapter && version) {
      try {
        const data = await getChapter(version, book, chapter);
        if (data && "verses" in data && data.verses && !Array.isArray(data.verses)) {
          chapterText = formatChapterText(data.verses as Record<string, string>);
        }
      } catch {
        // proceed without context
      }
    }

    // ── Gemini call ────────────────────────────────────────────────
    const contents: AiTurn[] = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
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
    } catch (err) {
      await refund();
      // A capacity blip that survived every retry reads the same to the user
      // as a rate limit: come back in a minute.
      if (err instanceof AiBusyError || isRateLimitError(err)) {
        return NextResponse.json(
          {
            error: "Het is momenteel erg druk. Probeer het over een minuutje opnieuw.",
            code: "AI_BUSY",
          },
          { status: 429 },
        );
      }
      console.error("[ai-chat] Gemini error:", err);
      return NextResponse.json({ error: "AI-aanroep mislukt" }, { status: 502 });
    }

    if (!reply || reply.trim().length === 0) {
      // Safety block or empty candidate - degrade gracefully and refund.
      await refund();
      return NextResponse.json({
        reply: BLOCKED_REPLY,
        used: newCount - 1,
        cap: unlimited ? null : cap,
      });
    }

    if (cacheable) await writeCachedAnswer(cacheCtx, reply, model);

    return NextResponse.json({
      reply,
      used: newCount,
      cap: unlimited ? null : cap,
    });
  } catch (err) {
    console.error("[ai-chat] Server error:", err);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet geauthenticeerd" }, { status: 401 });
    }

    const configured = !!process.env.GEMINI_API_KEY;

    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email }).lean<{
      _id: unknown;
      subscribed?: boolean;
      isAdmin?: boolean;
    }>();
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    const unlimited = !!user.subscribed || !!user.isAdmin || isAdminEmail(session.user.email);
    const cap = unlimited ? PREMIUM_DAILY_CAP : FREE_DAILY_CAP;

    let used = 0;
    try {
      const doc = await AiUsage.findOne({ userId: user._id, day: currentDay() }).lean<{
        count: number;
      }>();
      used = doc?.count ?? 0;
    } catch {
      /* ignore */
    }

    return NextResponse.json({ configured, used, cap, unlimited });
  } catch (err) {
    console.error("[ai-chat] Server error:", err);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}
