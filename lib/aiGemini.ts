import { GoogleGenAI } from "@google/genai";

// "gemini-2.5-flash" and "gemini-2.0-flash" are no longer available to new API
// projects; the -latest alias currently resolves to the newest flash model
// (Gemini 3).
export const AI_MODEL = "gemini-flash-latest";

// The free tier's request quota is granted *per project per model*, so the lite
// model has its own separate daily allowance. That makes it a genuine rescue
// both when flash is out of quota (429) and when it is overloaded (503).
export const AI_FALLBACK_MODEL = "gemini-flash-lite-latest";

// Google returns 503 UNAVAILABLE ("experiencing high demand") for a sizeable
// share of free-tier calls. Those are transient, so we retry before giving up.
const RETRY_DELAYS_MS = [400, 1200];

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

/** Thrown when every attempt (both models) came back transient. */
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

/**
 * One chat completion, hardened against the two ways the free tier fails:
 *
 *  - 503 UNAVAILABLE ("high demand"): retried on the same model after a short
 *    backoff, since the spike is usually over in a second.
 *  - 429 RESOURCE_EXHAUSTED (daily per-model quota): retrying the same model
 *    cannot help, so we skip straight to the fallback model's own quota.
 *
 * If the fallback is out too, an AiBusyError is thrown. Any other error is
 * rethrown untouched so the route can map it to its own status code.
 */
export async function generateChatReply({
  apiKey,
  contents,
  systemInstruction,
}: GenerateOptions): Promise<string | undefined> {
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

  // Primary model twice, then the lite model on its own quota.
  const attempts = [AI_MODEL, AI_MODEL, AI_FALLBACK_MODEL];
  let lastError: unknown;

  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = await call(attempts[i]);
      return result.text;
    } catch (err) {
      lastError = err;

      if (isRateLimitError(err)) {
        // Out of quota on this model: jump to the fallback immediately. If we
        // are already there, no bucket is left to try.
        if (attempts[i] === AI_FALLBACK_MODEL) break;
        i = attempts.lastIndexOf(AI_MODEL);
        continue;
      }

      if (!isTransientError(err)) throw err;
      const delay = RETRY_DELAYS_MS[i];
      if (delay !== undefined) await sleep(delay);
    }
  }

  throw new AiBusyError(lastError);
}
