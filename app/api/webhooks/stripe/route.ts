import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "../../../../lib/stripe";
import connectMongoDB from "../../../../lib/mongodb";
import WebhookEvent from "../../../../models/WebhookEvent";
import {
  clearBillingIssue,
  markBillingIssue,
  syncSubscription,
} from "../../../../lib/subscriptionSync";

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
 *
 * The state writing itself lives in lib/subscriptionSync so this route, the
 * /succes redirect and admin reconciliation cannot drift apart - and so that a
 * billing write is an `updateOne` on named fields rather than a full-document
 * `save()`, which one corrupt unrelated field was able to fail. See the comment
 * at the top of that file.
 */

// The signature is computed over the exact bytes Stripe sent, so this route must
// never run through a body parser that could re-serialise them.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          const result = await syncSubscription(subscription);
          if (!result.matched) {
            console.warn(
              `[stripe-webhook] ${event.type}: no local user for ${result.customerId} (${result.reason})`
            );
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const result = await syncSubscription(event.data.object as Stripe.Subscription);
        if (!result.matched) {
          console.warn(
            `[stripe-webhook] ${event.type}: no local user for ${result.customerId} (${result.reason})`
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        await markBillingIssue(event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_succeeded": {
        await clearBillingIssue(event.data.object as Stripe.Invoice);
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
