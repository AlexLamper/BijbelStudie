import { GoogleGenAI } from "@google/genai";

// "gemini-2.5-flash" and "gemini-2.0-flash" are no longer available to new API
// projects; the -latest alias currently resolves to the newest flash model
// (Gemini 3).
/**
 * Flash-Lite first, not Flash.
 *
 * The job here is answering a question about a bible passage in plain Dutch -
 * text in, text out. Flash-Lite does that, is the fastest of the family, and is
 * the cheapest per token, which is what the monthly budget in lib/aiBudget is
 * measured against. The heavier Flash models stay in the chain below as
 * fallbacks, so a Flash-Lite outage still gets answered rather than failing.
 */
export const AI_MODEL = "gemini-flash-lite-latest";

/**
 * One fallback, not five.
 *
 * The old six-entry chain existed to farm free-tier quota: that tier grants its
 * daily allowance *per project per model*, so each extra model was another
 * bucket of free requests. On the PAID tier there are no per-model daily
 * buckets to farm, which turns every extra entry into pure latency - a reader
 * waiting on a 429 walk down five models waits five round trips for an answer
 * the first model could not give them.
 *
 * What remains is the reason a chain exists at all: availability. If Flash-Lite
 * itself is down or overloaded, Flash answers instead. Anything past that is
 * insurance against an outage of the whole family, which a longer list would
 * not survive either.
 *
 * NOTE: this assumes the API project has billing enabled. Without it the app is
 * back on free-tier daily quotas with only two buckets to spend, and the
 * assistant will start returning AI_BUSY far sooner in the day.
 *
 * Aliases are not extra quota: `gemini-flash-latest` currently resolves to
 * `gemini-3.7-flash`, and both share one bucket, so only one of them belongs
 * here.
 */
export const AI_FALLBACK_MODELS = ["gemini-flash-latest"];

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

/**
 * The generation settings, in one place.
 *
 * Streaming and non-streaming must answer identically - the streamed reply is
 * cached and served back to later readers as if it had been generated in one
 * piece - so neither call site is allowed its own copy of this.
 */
function chatConfig(systemInstruction: string) {
  return {
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
  };
}

/**
 * Gemini's token counts, read structurally.
 *
 * The SDK types `usageMetadata` as its own class and `thoughtsTokenCount` is not
 * on every version of it, so this deliberately does not pin the app to one SDK
 * revision. A missing block yields zeroes, which leaves the pessimistic upfront
 * reservation in lib/aiBudget standing - the safe direction.
 */
function readUsage(raw: unknown): { inputTokens: number; outputTokens: number } {
  const meta = raw as
    | { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
    | undefined;
  return {
    inputTokens: meta?.promptTokenCount ?? 0,
    // Thinking tokens are billed as output, so they belong in this sum -
    // leaving them out would under-report every answer.
    outputTokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
  };
}

interface GenerateOptions {
  apiKey: string;
  contents: AiTurn[];
  systemInstruction: string;
}

export interface AiReply {
  text: string | undefined;
  /** Which model actually answered, for cache bookkeeping and logs. */
  model: string;
  /**
   * What the call actually consumed, straight from Gemini's `usageMetadata`.
   *
   * The budget ledger settles on this rather than on an estimate, so the
   * recorded spend is the real one. Gemini has been known to omit the block on
   * some responses; zeroes then leave the pessimistic reservation standing,
   * which errs towards the cap being reached sooner - the safe direction.
   */
  usage: { inputTokens: number; outputTokens: number };
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
      config: chatConfig(systemInstruction),
    } as Parameters<typeof ai.models.generateContent>[0]);

  let lastError: unknown;

  for (const model of AI_MODEL_CHAIN) {
    // Only the primary is worth a second shot; further down the chain another
    // model is a cheaper bet than waiting out the same one.
    const tries = model === AI_MODEL ? 2 : 1;

    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const result = await call(model);
        return { text: result.text, model, usage: readUsage(result.usageMetadata) };
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


/** What a finished stream reports back, once the last chunk has arrived. */
export interface AiStreamMeta {
  /** Which model actually answered, for cache bookkeeping and logs. */
  model: string;
  /** Real token counts, for the budget ledger to settle on. */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * The same completion as `generateChatReply`, delivered token by token.
 *
 * Yields text fragments and RETURNS the metadata, so a caller reads it as:
 *
 *     const stream = streamChatReply(opts);
 *     for (;;) {
 *       const next = await stream.next();
 *       if (next.done) { settle(next.value.usage); break; }
 *       send(next.value);
 *     }
 *
 * (`for await` is not usable here: it throws the return value away, and that
 * value is what the budget settles on.)
 *
 * FALLBACK STOPS AT THE FIRST TOKEN. Until a fragment has been yielded, a
 * failure is handled exactly as in `generateChatReply` - retry the primary once
 * on a transient error, skip to the next model on a quota error. After the first
 * fragment the caller has already put those words on someone's screen, and
 * silently restarting on another model would rewrite the answer mid-sentence, so
 * the error is thrown and the caller decides what to show. That is also why
 * spend is settled on what was streamed: those tokens were billed either way.
 */
export async function* streamChatReply({
  apiKey,
  contents,
  systemInstruction,
}: GenerateOptions): AsyncGenerator<string, AiStreamMeta, undefined> {
  const ai = new GoogleGenAI({ apiKey });

  const open = (model: string) =>
    ai.models.generateContentStream({
      model,
      contents,
      config: chatConfig(systemInstruction),
    } as Parameters<typeof ai.models.generateContentStream>[0]);

  let lastError: unknown;

  for (const model of AI_MODEL_CHAIN) {
    const tries = model === AI_MODEL ? 2 : 1;

    for (let attempt = 0; attempt < tries; attempt++) {
      let emitted = false;
      // The last chunk carries the totals, but not every chunk does, so keep the
      // most recent block seen rather than assuming where it lands.
      let usage = { inputTokens: 0, outputTokens: 0 };

      try {
        const stream = await open(model);

        for await (const chunk of stream) {
          if (chunk.usageMetadata) usage = readUsage(chunk.usageMetadata);
          const text = chunk.text;
          if (text) {
            emitted = true;
            yield text;
          }
        }

        return { model, usage };
      } catch (err) {
        lastError = err;
        // Past the first token there is no going back: another model would start
        // a different answer underneath one already being read.
        if (emitted) throw err;
        if (isRateLimitError(err)) break;
        if (!isTransientError(err)) throw err;
        if (attempt + 1 < tries) await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new AiBusyError(lastError);
}
