import { createHash } from "crypto";
import AiAnswer from "../models/AiAnswer";

/**
 * Bumping this invalidates every cached answer. Change it whenever the system
 * prompt in aiPrompt.ts changes in a way that should alter existing answers.
 */
const PROMPT_VERSION = 1;

const CACHE_TTL_DAYS = 365;

/** Questions long enough to be personal narrative are rarely worth caching. */
const MAX_CACHEABLE_QUESTION_LENGTH = 300;

export interface CacheContext {
  question: string;
  book: string | null;
  chapter: number | null;
  version: string | null;
}

/**
 * Folds away the differences that do not change the answer: casing, spacing and
 * trailing punctuation. Diacritics are kept, since in Dutch they can carry
 * meaning ("een" vs "één").
 */
export function normalizeQuestion(question: string): string {
  return (
    question
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      // Must run after trim, or a trailing space defeats the anchor.
      .replace(/[?!.,;:'"“”‘’]+$/u, "")
      .trim()
  );
}

export function cacheKey({ question, book, chapter, version }: CacheContext): string {
  // The reading context is part of the key because it is fed to the model as
  // chapter text, so the same question can have a different answer per chapter.
  const material = [
    `v${PROMPT_VERSION}`,
    version ?? "",
    book ?? "",
    chapter ?? "",
    normalizeQuestion(question),
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

/**
 * Multi-turn answers depend on the conversation, so only a first question with
 * no history can be served from, or written to, a shared cache.
 */
export function isCacheable(question: string, historyLength: number): boolean {
  return historyLength === 0 && normalizeQuestion(question).length <= MAX_CACHEABLE_QUESTION_LENGTH;
}

/**
 * Returns a previously generated answer, or null. Never throws: a cache problem
 * must degrade into a normal Gemini call, not into a failed request.
 */
export async function readCachedAnswer(ctx: CacheContext): Promise<string | null> {
  try {
    const key = cacheKey(ctx);
    const doc = await AiAnswer.findOneAndUpdate(
      { key },
      { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } },
      { new: true },
    ).lean<{ reply?: string }>();
    return doc?.reply ?? null;
  } catch {
    return null;
  }
}

/** Stores an answer for later reuse. Best-effort, never throws. */
export async function writeCachedAnswer(
  ctx: CacheContext,
  reply: string,
  model: string | null,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await AiAnswer.updateOne(
      { key: cacheKey(ctx) },
      {
        $set: {
          question: ctx.question,
          book: ctx.book,
          chapter: ctx.chapter,
          version: ctx.version,
          reply,
          model,
          expiresAt,
        },
        $setOnInsert: { hits: 0 },
      },
      { upsert: true },
    );
  } catch {
    // A cache write failure must never affect the answer already produced.
  }
}
