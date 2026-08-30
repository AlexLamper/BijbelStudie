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
  isRateLimitError,
  streamChatReply,
  type AiTurn,
} from "../../../../lib/aiGemini";
import {
  isCacheable,
  readCachedAnswer,
  writeCachedAnswer,
  type CacheContext,
} from "../../../../lib/aiAnswerCache";
import {
  readAiBudget,
  refundAiReservation,
  reserveAiSpend,
  settleAiSpend,
} from "../../../../lib/aiBudget";

/**
 * A slow answer is usually generateChatReply walking its fallback chain, which
 * can outlast the platform default. Without an explicit ceiling the function is
 * killed mid-flight and the browser sees a generic connection failure instead of
 * the AI_BUSY state the client knows how to explain. 60s is the limit on every
 * Vercel plan, so this is safe to raise only if the account allows it.
 */
export const maxDuration = 60;

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

    // ── Application-wide budget ────────────────────────────────────
    // The per-user cap above bounds one person; this bounds the bill. It is
    // claimed only once the cache has missed, because a cache hit never reaches
    // the provider and so costs nothing to serve.
    const reservation = await reserveAiSpend();
    if (!reservation.allowed) {
      await refund();
      console.warn(
        `[ai-chat] Budget guard refused a call (${reservation.reason}) - month ${reservation.month}, ${reservation.requests} requests`,
      );
      return NextResponse.json(
        {
          error:
            reservation.reason === "LEDGER_UNAVAILABLE"
              ? "De AI-assistent is nu even niet beschikbaar. Probeer het zo opnieuw."
              : "De AI-assistent is deze maand tijdelijk uitgeschakeld. Probeer het volgende maand opnieuw.",
          code: "AI_BUDGET_EXHAUSTED",
        },
        { status: 503 },
      );
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

    // ── Gemini call, streamed ──────────────────────────────────────
    const contents: AiTurn[] = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    /**
     * Everything above still answers with ordinary JSON and its own status code:
     * not signed in, out of questions, budget spent, cache hit. Only the
     * generation itself streams, as newline-delimited JSON, and the client
     * branches on the content type.
     *
     * The trade of streaming is that the status line is committed before the
     * answer exists, so a failure from here on is a 200 carrying an `error`
     * event rather than a 502. That is the price of first words in half a second
     * instead of a blank panel for eight.
     */
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}
`));
        };

        // What has actually reached the reader. Both the refund decision and the
        // cache write hang off this, so it is the one thing kept honest.
        let answer = "";
        const generation = streamChatReply({
          apiKey,
          contents,
          systemInstruction: buildSystemInstruction(book, chapter, version, chapterText),
        });

        try {
          // Sent before the first token so the counter under the composer is
          // right even if the generation later breaks halfway.
          send({ type: "meta", used: newCount, cap: unlimited ? null : cap });

          let usage = { inputTokens: 0, outputTokens: 0 };
          let model: string | null = null;
          for (;;) {
            const next = await generation.next();
            if (next.done) {
              usage = next.value.usage;
              model = next.value.model;
              break;
            }
            answer += next.value;
            send({ type: "delta", text: next.value });
          }

          // The tokens are billed whatever the answer turned out to be, so the
          // ledger settles before any judgement about the text itself.
          await settleAiSpend(usage.inputTokens, usage.outputTokens);

          if (answer.trim().length === 0) {
            // Safety block or empty candidate - refund the user's question, but
            // NOT the budget: the provider was called either way.
            await refund();
            send({ type: "blocked", reply: BLOCKED_REPLY, used: newCount - 1 });
          } else {
            if (cacheable) await writeCachedAnswer(cacheCtx, answer, model);
            send({ type: "done", used: newCount });
          }
        } catch (err) {
          if (answer.length === 0) {
            // Nothing was generated and nothing was read: give back both the
            // question and the reservation.
            await refund();
            await refundAiReservation();
          } else {
            // Half an answer is still a billed answer, so the reservation
            // stands; the reader keeps the words that arrived.
            console.error("[ai-chat] Stream broke mid-answer:", err);
          }

          const busy = err instanceof AiBusyError || isRateLimitError(err);
          if (!busy) console.error("[ai-chat] Gemini error:", err);
          send({
            type: "error",
            code: busy ? "AI_BUSY" : "AI_CALL_FAILED",
            error: busy
              ? "Het is momenteel erg druk. Probeer het over een minuutje opnieuw."
              : "AI-aanroep mislukt",
            partial: answer.length > 0,
          });
        } finally {
          // A reader who closes the tab mid-answer leaves the provider call
          // open; this ends it rather than letting it run on unread.
          await generation.return?.({ model: "", usage: { inputTokens: 0, outputTokens: 0 } });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        // Proxy buffering would hold the tokens back and undo the streaming.
        "X-Accel-Buffering": "no",
      },
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
    const budget = await readAiBudget();

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

    // `budgetExhausted` lets the client say "uitgeschakeld deze maand" instead of
    // letting the reader discover it by asking a question and being refused.
    // Only admins see the figures themselves; a number that reveals how close
    // the app is to switching itself off is operational detail, not user copy.
    return NextResponse.json({
      configured,
      used,
      cap,
      unlimited,
      budgetExhausted: budget?.exhausted ?? false,
      budget: user.isAdmin || isAdminEmail(session.user.email) ? budget : undefined,
    });
  } catch (err) {
    console.error("[ai-chat] Server error:", err);
    return NextResponse.json({ error: "Server fout" }, { status: 500 });
  }
}
