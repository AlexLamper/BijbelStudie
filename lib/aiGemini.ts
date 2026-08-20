import { GoogleGenAI } from "@google/genai";

// "gemini-2.5-flash" and "gemini-2.0-flash" are no longer available to new API
// projects; the -latest alias currently resolves to the newest flash model
// (Gemini 3).
export const AI_MODEL = "gemini-flash-latest";

/**
 * The free tier grants its daily request quota *per project per model*, so every
 * distinct model is a separate bucket and the chain multiplies the number of
 * questions the app can answer per day. Ordered best-quality first; each entry
 * was verified against the exact config below (gemma-4-31b-it is deliberately
 * absent - it rejects `thinkingConfig` with a 400).
 *
 * Aliases are not extra quota: `gemini-flash-latest` currently resolves to
 * `gemini-3.7-flash`, and both share one bucket, so only one of them belongs
 * here.
 */
export const AI_FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export const AI_MODEL_CHAIN = [AI_MODEL, ...AI_FALLBACK_MODELS];

// Google returns 503 UNAVAILABLE ("experiencing high demand") for a sizeable
// share of free-tier calls. Those are transient, so the primary model gets a
// second attempt before we move down the chain.
const RETRY_DELAY_MS = 600;

export interface AiTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Quota exhausted for a model. Retrying the same model is pointless - the free
 * tier's daily allowance does not come back for hours - but another model has
 * its own bucket, so this is worth a fallback rather than an immediate failure.
 */
export function isRateLimitError(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (e?.status === 429) return true;
  const msg = String(e?.message ?? err ?? "");
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

/** Capacity blip on Google's side - safe to retry. */
export function isTransientError(err: unknown): boolean {
  if (isRateLimitError(err)) return false;
  const e = err as { status?: number; message?: string } | null;
  if (e?.status === 503 || e?.status === 500) return true;
  const msg = String(e?.message ?? err ?? "");
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("INTERNAL") ||
    msg.includes("overloaded") ||
    msg.includes("high demand")
  );
}

/** Thrown when every model in the chain was out of quota or unavailable. */
export class AiBusyError extends Error {
  constructor(readonly cause: unknown) {
    super("Gemini unavailable after retries");
    this.name = "AiBusyError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GenerateOptions {
  apiKey: string;
  contents: AiTurn[];
  systemInstruction: string;
}

export interface AiReply {
  text: string | undefined;
  /** Which model actually answered, for cache bookkeeping and logs. */
  model: string;
}

/**
 * One chat completion, hardened against the two ways the free tier fails:
 *
 *  - 503 UNAVAILABLE ("high demand"): the primary model is retried once after a
 *    short backoff, since the spike is usually over in a second.
 *  - 429 RESOURCE_EXHAUSTED (daily per-model quota): retrying the same model
 *    cannot help, so we move straight down the chain to a model whose own daily
 *    bucket is still intact.
 *
 * If every model is spent, an AiBusyError is thrown. Any other error is
 * rethrown untouched so the route can map it to its own status code.
 */
export async function generateChatReply({
  apiKey,
  contents,
  systemInstruction,
}: GenerateOptions): Promise<AiReply> {
  const ai = new GoogleGenAI({ apiKey });

  const call = (model: string) =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.6,
        // Gemini 3: maxOutputTokens includes thinking tokens; LOW keeps
        // thinking small and fast (thinkingBudget: 0 is rejected here).
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingLevel: "LOW" },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      },
    } as Parameters<typeof ai.models.generateContent>[0]);

  let lastError: unknown;

  for (const model of AI_MODEL_CHAIN) {
    // Only the primary is worth a second shot; further down the chain another
    // model is a cheaper bet than waiting out the same one.
    const tries = model === AI_MODEL ? 2 : 1;

    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const result = await call(model);
        return { text: result.text, model };
      } catch (err) {
        lastError = err;
        // Out of quota for the day: no retry can help, move to the next bucket.
        if (isRateLimitError(err)) break;
        if (!isTransientError(err)) throw err;
        if (attempt + 1 < tries) await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new AiBusyError(lastError);
}
