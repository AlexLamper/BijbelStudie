import { type NextRequest, NextResponse } from "next/server"
import stripe from "../../../lib/stripe"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import {
  BILLING_SELECT,
  type LocalBilling,
  emptySnapshot,
  pickPrimary,
  snapshotOf,
  writeSnapshot,
} from "../../../lib/subscriptionSync"

/**
 * Called by /succes with the checkout session id from the redirect URL.
 *
 * The webhook is the authority for entitlement; this exists so the success page
 * can state the real billing terms immediately instead of waiting for a delivery
 * that may land a second later. Both write through the same helper, so they
 * cannot disagree.
 *
 * Two things this route must get right:
 *
 *  - `sessionId` comes from the browser, so it is an *untrusted* pointer to a
 *    Stripe object. It is only ever used to look the session up; the session is
 *    then checked to belong to the caller before anything is written. Without
 *    that check, any signed-in user who got hold of somebody else's `cs_...` id
 *    could hand it in and be granted that person's subscription.
 *  - The write is an `updateOne` on named billing fields, never `user.save()`.
 *    A `save()` here validates the whole user document, so one unrelated corrupt
 *    field (see lib/subscriptionSync) turned this route into a 500 and sent a
 *    customer who had just paid back to the pricing page.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })
      .select(BILLING_SELECT)
      .lean<LocalBilling>()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    const sessionCustomerId =
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : checkoutSession.customer?.id ?? null

    // Ownership check. The checkout route stamps `metadata.userId` on every
    // session it creates, and the customer is derived from the signed-in user
    // there too, so either match proves this session is the caller's own.
    const ownsSession =
      checkoutSession.metadata?.userId === String(user._id) ||
      (!!sessionCustomerId && sessionCustomerId === user.stripeCustomerId)

    if (!ownsSession) {
      console.warn(
        `[verify-subscription] Session ${sessionId} does not belong to user ${String(user._id)}`
      )
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
    }

    let snapshot = emptySnapshot()

    if (checkoutSession.mode === "subscription" && checkoutSession.subscription) {
      const subscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : checkoutSession.subscription.id
      snapshot = snapshotOf(await stripe.subscriptions.retrieve(subscriptionId))
    } else if (sessionCustomerId) {
      // Not a subscription checkout. Fall back to whatever the customer has, so
      // a stale local flag still gets corrected here.
      const list = await stripe.subscriptions.list({
        customer: sessionCustomerId,
        status: "all",
        limit: 100,
      })
      const primary = pickPrimary(list.data)
      if (primary) snapshot = snapshotOf(primary)
    }

    await writeSnapshot(user, snapshot, { customerId: sessionCustomerId })

    return NextResponse.json({
      success: true,
      subscribed: snapshot.subscribed,
      interval: snapshot.subscriptionInterval,
      status: snapshot.subscriptionStatus,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    })
  } catch (error) {
    console.error("[verify-subscription] Failed:", error)
    return NextResponse.json(
      {
        error: "Error verifying subscription",
      },
      { status: 500 },
    )
  }
}
