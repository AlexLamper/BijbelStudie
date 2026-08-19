import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "../../../../lib/stripe";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import WebhookEvent from "../../../../models/WebhookEvent";

/**
 * Stripe webhook. Until this existed, a user's Pro access was granted only if
 * their browser reached /succes and called /api/verify-subscription - so a
 * closed tab meant a completed payment with no access, and a cancelled or
 * failed subscription never revoked access at all.
 *
 * Security properties this route depends on:
 *  - Every request is authenticated by Stripe's signature over the *raw* body.
 *    `stripe.webhooks.constructEvent` throws on a bad or replayed-stale
 *    signature, and nothing below runs unless it succeeds. The raw text must be
 *    read before any JSON parsing or the signature will never match.
 *  - Nothing in the request body is trusted for identity. The customer is looked
 *    up by the Stripe customer id contained in the *verified* event.
 *  - Delivery is idempotent: the event id is inserted into WebhookEvent first
 *    and a duplicate-key error means "already handled", so Stripe's retries
 *    cannot double-apply anything.
 *  - Handler errors return 500 so Stripe retries, but a *verification* failure
 *    returns 400 so it does not.
 */

// The signature is computed over the exact bytes Stripe sent, so this route must
// never run through a body parser that could re-serialise them.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end: number;
  current_period_start: number;
};

/** Stripe statuses that should grant access. */
const ENTITLED = new Set(["active", "trialing"]);

function intervalOf(subscription: Stripe.Subscription): "monthly" | "annual" | null {
  const recurring = subscription.items.data[0]?.price?.recurring;
  if (!recurring) return null;
  if (recurring.interval === "year") return "annual";
  if (recurring.interval === "month") return "monthly";
  return null;
}

/**
 * Writes the full billing state for whichever user owns this Stripe customer.
 * Matching is by stripeCustomerId first and email only as a fallback, because
 * the customer id is the identifier Stripe itself considers authoritative.
 */
async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const sub = subscription as SubscriptionWithPeriod;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  await connectMongoDB();

  let user = await User.findOne({ stripeCustomerId: customerId });

  if (!user) {
    // First subscription for this account: the customer was created during
    // checkout and the local record may not carry the id yet. `metadata.userId`
    // is set by our own checkout route, so it is trustworthy here - it arrived
    // inside a signature-verified event, not from a browser.
    const metadataUserId = sub.metadata?.userId;
    if (metadataUserId) {
      user = await User.findById(metadataUserId);
    }
    if (!user) {
      const customer = await stripe.customers.retrieve(customerId);
      // `retrieve` widens to Customer | DeletedCustomer; only the live one has
      // an email.
      const email = customer.deleted ? null : (customer as Stripe.Customer).email;
      if (email) user = await User.findOne({ email });
    }
    if (user) user.stripeCustomerId = customerId;
  }

  if (!user) {
    console.warn(`[stripe-webhook] No local user for customer ${customerId}`);
    return;
  }

  const entitled = ENTITLED.has(sub.status);

  user.subscribed = entitled;
  user.subscriptionStatus = sub.status;
  user.stripeSubscriptionId = sub.id;
  user.stripePriceId = sub.items.data[0]?.price?.id ?? user.stripePriceId;
  user.subscriptionInterval = intervalOf(sub) ?? user.subscriptionInterval;
  user.cancelAtPeriodEnd = !!sub.cancel_at_period_end;
  user.currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;

  if (!user.subscriptionStartedAt && sub.start_date) {
    user.subscriptionStartedAt = new Date(sub.start_date * 1000);
  }

  // `pause_collection.resumes_at` is null for an indefinite pause.
  user.pausedUntil = sub.pause_collection
    ? sub.pause_collection.resumes_at
      ? new Date(sub.pause_collection.resumes_at * 1000)
      : new Date(8640000000000000)
    : null;

  // A healthy status clears any outstanding billing problem.
  if (entitled && sub.status !== "past_due") {
    user.billingIssueSince = null;
  }

  await user.save();
}

async function applyPaymentFailure(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await connectMongoDB();
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  // Access is deliberately NOT revoked here. Stripe keeps retrying for days and
  // most failures are an expired card, not an intent to leave - pulling access
  // immediately converts a recoverable payment into a cancellation. The
  // subscription status change (past_due -> canceled/unpaid) is what eventually
  // revokes it, via applySubscription above.
  if (!user.billingIssueSince) {
    user.billingIssueSince = new Date();
    await user.save();
  }
}

async function applyPaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await connectMongoDB();
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user || !user.billingIssueSince) return;

  user.billingIssueSince = null;
  await user.save();
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body, byte for byte. Any reserialisation breaks the signature.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    // Unverified input. Log the failure, never the payload.
    console.error(
      "[stripe-webhook] Signature verification failed:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency gate. Claim the event id before doing any work; a duplicate key
  // means another delivery of the same event already ran.
  try {
    await connectMongoDB();
    await WebhookEvent.create({
      provider: "stripe",
      eventId: event.id,
      payloadSummary: event.type,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] Could not record event:", error);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.payment_failed": {
        await applyPaymentFailure(event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_succeeded": {
        await applyPaymentSuccess(event.data.object as Stripe.Invoice);
        break;
      }

      default:
        // Unhandled types are acknowledged so Stripe stops retrying them.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[stripe-webhook] Handler failed for ${event.type}:`, error);
    // 500 so Stripe retries. The idempotency row is already written, so release
    // it to let that retry actually do the work.
    await WebhookEvent.deleteOne({ provider: "stripe", eventId: event.id }).catch(() => {});
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
