import { type NextRequest, NextResponse } from "next/server"
import stripe from "../../../lib/stripe"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"

/**
 * Creates a Stripe Checkout session for the signed-in user.
 *
 * Two things this route deliberately does NOT accept from the client:
 *
 *  - a price id. It previously took `priceId` straight from the request body and
 *    passed it to Stripe, which let any caller subscribe at any price that
 *    existed in the account - including archived, discounted or €0 test prices.
 *    The client now sends only `interval`, and the price id is resolved from
 *    server configuration.
 *  - a customer id. It previously took `customerId` from the body and attached
 *    the checkout session to it, which let a caller bind a subscription to
 *    another person's Stripe customer and read their billing details through the
 *    returned session. The customer is now derived from the session user alone.
 */

const ALLOWED_ORIGIN = "https://www.bijbelstudie.io"

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

type Interval = "monthly" | "annual"

function isInterval(value: unknown): value is Interval {
  return value === "monthly" || value === "annual"
}

/**
 * Server-side price resolution. Prefers the non-public variables; falls back to
 * the NEXT_PUBLIC_ ones the pricing page already uses so existing deployments
 * keep working without a config change.
 */
function priceIdFor(interval: Interval): string | undefined {
  return interval === "annual"
    ? process.env.STRIPE_ANNUAL_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
    : process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
}

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
  return response
}

export async function POST(req: NextRequest) {
  try {
    // Authentication first: an anonymous checkout would create a subscription
    // with no account to attach the entitlement to.
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return json({ error: "Niet ingelogd", code: "unauthenticated" }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const interval: unknown = (body as { interval?: unknown }).interval

    if (!isInterval(interval)) {
      return json({ error: "Ongeldig abonnement", code: "bad_interval" }, 400)
    }

    const priceId = priceIdFor(interval)
    if (!priceId) {
      console.error(`[checkout] No price configured for interval "${interval}"`)
      return json({ error: "Configuratiefout", code: "no_price" }, 500)
    }

    // Guard against a test price being used with a live key and vice versa - the
    // resulting Stripe error is otherwise very hard to read.
    const apiKeyMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live"
    const price = await stripe.prices.retrieve(priceId)
    const priceMode = price.livemode ? "live" : "test"
    if ((apiKeyMode === "live") !== (priceMode === "live")) {
      console.error("[checkout] Stripe key/price mode mismatch")
      return json({ error: "Configuratiefout", code: "mode_mismatch" }, 500)
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return json({ error: "Gebruiker niet gevonden", code: "no_user" }, 404)
    }

    // Refuse to start a second subscription for someone who already has one.
    if (user.subscribed && user.stripeSubscriptionId) {
      return json({ error: "Je hebt al een actief abonnement", code: "already_subscribed" }, 409)
    }

    // Resolve (or create) the Stripe customer from the session user only.
    let stripeCustomerId: string | undefined = user.stripeCustomerId || undefined

    if (stripeCustomerId) {
      // A customer created in the other mode will not resolve; replace it rather
      // than failing the checkout.
      try {
        const existing = await stripe.customers.retrieve(stripeCustomerId)
        if (existing.deleted) stripeCustomerId = undefined
      } catch {
        stripeCustomerId = undefined
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      })
      stripeCustomerId = customer.id

      // `updateOne` on the one field, not `user.save()`.
      //
      // This line is where the readChapters corruption came from. Saving the
      // whole hydrated document to store a single id made Mongoose serialise the
      // `readChapters` Map wholesale, and its own schema path `$*` went into the
      // update as a literal key - which then made every later full save of that
      // user throw. Writing the field we actually changed cannot touch anything
      // else, and it is the same discipline the billing writes already follow
      // (see the note in app/api/verify-subscription).
      await User.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customer.id } })
      user.stripeCustomerId = customer.id
    }

    const origin = ALLOWED_ORIGIN

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal", "bancontact", "sepa_debit"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      // Dutch route names. These used to point at /success and /canceled, which
      // only resolved via a redirect.
      success_url: `${origin}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/geannuleerd?interval=${interval}`,
      customer: stripeCustomerId,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      // Carried into the subscription so the webhook can resolve the account
      // even before stripeCustomerId has been written locally.
      subscription_data: {
        metadata: { userId: user._id.toString(), interval },
      },
      metadata: { userId: user._id.toString(), interval },
      // Supports the 14-day withdrawal right: the customer actively agrees to
      // the terms, and Stripe stores the acceptance against the session, which
      // is where that evidence needs to live.
      //
      // Opt-in via env because Stripe rejects the whole session unless a Terms
      // of Service URL is set in Dashboard -> Settings -> Public details. Set
      // that URL to https://www.bijbelstudie.io/algemene-voorwaarden, then set
      // STRIPE_REQUIRE_TOS_CONSENT=true. Enabling it before the URL exists would
      // break live checkout.
      ...(process.env.STRIPE_REQUIRE_TOS_CONSENT === "true"
        ? { consent_collection: { terms_of_service: "required" as const } }
        : {}),
    })

    return json({ sessionId: stripeSession.id, url: stripeSession.url })
  } catch (error) {
    console.error("[checkout] Error creating checkout session:", error)
    // Never return the raw Stripe error to the browser - it can carry account
    // and configuration detail.
    return json({ error: "Kon de betaling niet starten", code: "stripe_error" }, 500)
  }
}
