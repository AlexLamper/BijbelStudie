import { type NextRequest, NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { reconcileUserFromStripe } from "../../../../lib/subscriptionSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_USERS = 500;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function isAuthorized(req: NextRequest, secrets: string[]): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const header = req.headers.get("x-reconcile-secret") ?? "";
  return secrets.some((secret) => bearer === secret || header === secret);
}

/**
 * Periodic Stripe->Mongo entitlement repair.
 *
 * Intended for cron/scheduler use only. Access is gated by
 * SUBSCRIPTION_RECONCILE_CRON_SECRET via `Authorization: Bearer ...` (or
 * `x-reconcile-secret`).
 */
export async function GET(req: NextRequest) {
  const secrets = [
    process.env.SUBSCRIPTION_RECONCILE_CRON_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value);
  if (secrets.length === 0) {
    console.error(
      "[internal/reconcile-subscriptions] Missing SUBSCRIPTION_RECONCILE_CRON_SECRET/CRON_SECRET"
    );
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!isAuthorized(req, secrets)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = parsePositiveInt(process.env.SUBSCRIPTION_RECONCILE_BATCH, DEFAULT_BATCH_SIZE);
  const maxUsers = parsePositiveInt(process.env.SUBSCRIPTION_RECONCILE_MAX_USERS, DEFAULT_MAX_USERS);

  const targetFilter = {
    $or: [
      { stripeCustomerId: { $exists: true, $ne: null } },
      { stripeSubscriptionId: { $exists: true, $ne: null } },
      { subscriptionStatus: { $ne: null } },
    ],
  };

  await connectMongoDB();

  let scanned = 0;
  let repaired = 0;
  let missing = 0;
  let failed = 0;
  let lastId: string | null = null;
  const repairs: { userId: string; changed: string[] }[] = [];
  const errors: { userId: string; error: string }[] = [];

  while (scanned < maxUsers) {
    const remaining = Math.max(0, maxUsers - scanned);
    if (remaining === 0) break;

    const page = await User.find(
      lastId ? { ...targetFilter, _id: { $gt: lastId } } : targetFilter
    )
      .sort({ _id: 1 })
      .select("_id")
      .limit(Math.min(batchSize, remaining))
      .lean<{ _id: unknown }[]>();

    if (page.length === 0) break;

    for (const row of page) {
      const userId = String(row._id);
      lastId = userId;
      scanned += 1;
      try {
        const result = await reconcileUserFromStripe(userId);
        if (!result.matched) {
          missing += 1;
          continue;
        }
        if (result.changed.length > 0) {
          repaired += 1;
          if (repairs.length < 25) {
            repairs.push({ userId, changed: result.changed });
          }
        }
      } catch (error) {
        failed += 1;
        if (errors.length < 25) {
          errors.push({
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    repaired,
    missing,
    failed,
    maxUsers,
    batchSize,
    repairs,
    errors,
    checkedAt: new Date().toISOString(),
  });
}
