import connectMongoDB from "./mongodb";
import AiSpend from "../models/AiSpend.js";

/**
 * The hard ceiling on what the AI may cost, for everyone, per month.
 *
 * WHY THIS EXISTS SEPARATELY FROM AiUsage
 * `AiUsage` caps one person per day. That bounds abuse, not spend: the bill
 * scales with the number of accounts, and a thousand free users at five
 * questions each is five thousand paid calls that no per-user limit objects to.
 * This module is the ceiling on the sum.
 *
 * THE THREE RULES THAT MAKE IT UNBYPASSABLE
 *
 *  1. RESERVE BEFORE CALLING, CHECK AFTER INCREMENTING. The counter is bumped
 *     with a single atomic `$inc` and the DECISION IS MADE ON THE VALUE THE
 *     DATABASE RETURNS. Read-then-write would let N concurrent requests all
 *     read "just under the cap" and all proceed; incrementing first means
 *     exactly one of them can see a value at the limit, and the rest see
 *     themselves over it and are refused. This is the same shape the TTS route
 *     already uses.
 *
 *  2. FAIL CLOSED. Every error path returns `allowed: false`. If Mongo is
 *     unreachable we cannot know what has been spent, and "we don't know" must
 *     mean "don't spend". A guard that opens when its bookkeeping breaks is not
 *     a guard - that is precisely the hole an outage would drive a bill through.
 *
 *  3. EVERY DOOR IS GUARDED. Both the website route (app/api/ai/chat) and the
 *     mobile route (app/api/v1/ai/chat) reserve through here. Adding a third
 *     entry point without calling `reserveAiSpend` reopens the hole, so do not.
 *
 * Caps are read from the environment so they can be tightened in production
 * without a deploy, but they always fall back to the safe constants below - an
 * unset or malformed variable can only ever make the limit STRICTER, never
 * absent.
 */

/** Microcents per euro cent, for readability at the call sites. */
const MICRO = 1_000_000;

/**
 * Pessimistic token prices, in microcents per token.
 *
 * Deliberately the DEAREST Flash-Lite tier (roughly USD 0.30 in / USD 2.50 out
 * per million tokens, checked 2026-08-30), not the cheapest, and rounded up.
 * Over-estimating is the safe direction: the budget bites earlier than the real
 * invoice, never later. If the model changes, raise these first and measure
 * afterwards.
 */
const INPUT_MICROCENTS_PER_TOKEN = 33; // ≈ EUR 0,33 per 1M input tokens
const OUTPUT_MICROCENTS_PER_TOKEN = 275; // ≈ EUR 2,75 per 1M output tokens

/**
 * What one answer is assumed to cost before we know the real figure.
 *
 * Charged upfront at reservation time and corrected on settlement. It matters
 * that this is generous: between reserving and settling, a burst of concurrent
 * requests is bounded only by this number, so an optimistic estimate would let a
 * spike overshoot the cap before any of it settles. Sized for a full chapter of
 * context plus a long answer.
 */
const ASSUMED_MICROCENTS_PER_CALL = 400_000; // EUR 0,40 per call, worst case

/** Reads a positive integer from the environment, or falls back. */
function envCap(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  // Never let configuration LOOSEN the built-in ceiling.
  return Math.min(Math.floor(parsed), fallback);
}

/** Total provider calls allowed per month, across every user. */
export const MONTHLY_REQUEST_CAP = envCap("AI_MONTHLY_REQUEST_CAP", 20_000);

/**
 * Total spend allowed per month, in euro cents.
 *
 * EUR 15,00. Chosen to be smaller than one annual subscription: if the AI ever
 * runs away, it cannot outrun a single customer's payment before it shuts
 * itself off.
 */
export const MONTHLY_BUDGET_CENTS = envCap("AI_MONTHLY_BUDGET_CENTS", 1_500);

const MONTHLY_BUDGET_MICROCENTS = MONTHLY_BUDGET_CENTS * MICRO;

/** `YYYY-MM` in UTC, so the reset instant does not move with the clocks. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface Reservation {
  allowed: boolean;
  /** Why it was refused, for logs and for the Dutch message the route picks. */
  reason?: "REQUEST_CAP" | "BUDGET_CAP" | "LEDGER_UNAVAILABLE";
  month: string;
  requests: number;
  microCents: number;
}

export function estimateMicroCents(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    inputTokens * INPUT_MICROCENTS_PER_TOKEN + outputTokens * OUTPUT_MICROCENTS_PER_TOKEN,
  );
}

/**
 * Claim one call against the monthly budget.
 *
 * Returns `allowed: false` if this call would cross either ceiling, and undoes
 * its own increment when it does, so a refused request leaves no trace. Call
 * `settleAiSpend` after a successful answer and `refundAiReservation` if the
 * provider call fails.
 */
export async function reserveAiSpend(): Promise<Reservation> {
  const month = currentMonth();

  try {
    await connectMongoDB();

    const doc = await AiSpend.findOneAndUpdate(
      { month },
      {
        $inc: { requests: 1, microCents: ASSUMED_MICROCENTS_PER_CALL },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, new: true },
    ).lean<{ requests: number; microCents: number }>();

    const requests = doc?.requests ?? 1;
    const microCents = doc?.microCents ?? ASSUMED_MICROCENTS_PER_CALL;

    const overRequests = requests > MONTHLY_REQUEST_CAP;
    const overBudget = microCents > MONTHLY_BUDGET_MICROCENTS;

    if (overRequests || overBudget) {
      await refundAiReservation();
      // Stamped once per month; `$set` on an existing value is harmless and
      // avoids a second read to check whether it was already set.
      await AiSpend.updateOne(
        { month, cappedAt: null },
        { $set: { cappedAt: new Date() } },
      ).catch(() => {});

      return {
        allowed: false,
        reason: overRequests ? "REQUEST_CAP" : "BUDGET_CAP",
        month,
        requests: requests - 1,
        microCents: microCents - ASSUMED_MICROCENTS_PER_CALL,
      };
    }

    return { allowed: true, month, requests, microCents };
  } catch (error) {
    // Rule 2: unknown spend means no spend.
    console.error("[ai-budget] Ledger unavailable, refusing the call:", error);
    return {
      allowed: false,
      reason: "LEDGER_UNAVAILABLE",
      month,
      requests: 0,
      microCents: 0,
    };
  }
}

/**
 * Replace the upfront estimate with what the call actually cost.
 *
 * The delta can be negative - it usually is, because the reservation assumes the
 * worst case. Failure here is logged and swallowed: the money is already spent,
 * and throwing would turn a bookkeeping problem into a failed answer for a user
 * who has been served. The ledger self-corrects on the next settlement.
 */
export async function settleAiSpend(inputTokens: number, outputTokens: number): Promise<void> {
  const actual = estimateMicroCents(inputTokens, outputTokens);
  const delta = actual - ASSUMED_MICROCENTS_PER_CALL;

  try {
    await AiSpend.updateOne(
      { month: currentMonth() },
      {
        $inc: { microCents: delta, inputTokens, outputTokens },
        $set: { lastUpdated: new Date() },
      },
    );
  } catch (error) {
    console.error("[ai-budget] Could not settle actual cost:", error);
  }
}

/** Undo a reservation whose provider call never produced an answer. */
export async function refundAiReservation(): Promise<void> {
  try {
    await AiSpend.updateOne(
      { month: currentMonth() },
      { $inc: { requests: -1, microCents: -ASSUMED_MICROCENTS_PER_CALL } },
    );
  } catch (error) {
    console.error("[ai-budget] Could not refund reservation:", error);
  }
}

export interface BudgetStatus {
  month: string;
  requests: number;
  requestCap: number;
  spentCents: number;
  budgetCents: number;
  cappedAt: Date | null;
  exhausted: boolean;
}

/** Read-only view for the admin dashboard and the chat status endpoint. */
export async function readAiBudget(): Promise<BudgetStatus | null> {
  try {
    await connectMongoDB();
    const month = currentMonth();
    const doc = await AiSpend.findOne({ month }).lean<{
      requests?: number;
      microCents?: number;
      cappedAt?: Date | null;
    }>();

    const requests = doc?.requests ?? 0;
    const microCents = doc?.microCents ?? 0;

    return {
      month,
      requests,
      requestCap: MONTHLY_REQUEST_CAP,
      spentCents: Math.round(microCents / MICRO),
      budgetCents: MONTHLY_BUDGET_CENTS,
      cappedAt: doc?.cappedAt ?? null,
      exhausted: requests >= MONTHLY_REQUEST_CAP || microCents >= MONTHLY_BUDGET_MICROCENTS,
    };
  } catch {
    return null;
  }
}
