import { type NextRequest, NextResponse } from "next/server"
import stripe from "../../../lib/stripe"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let interval: "monthly" | "annual" | null = null

    // Update the user's Stripe customer ID if it's in the checkout session
    if (checkoutSession.customer) {
      user.stripeCustomerId = checkoutSession.customer as string
    }

    // If this is a subscription checkout
    if (checkoutSession.mode === "subscription" && checkoutSession.subscription) {

      const subscriptionId = checkoutSession.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // Update the user's subscription status
      user.subscribed = subscription.status === "active" || subscription.status === "trialing"
      user.stripeSubscriptionId = subscriptionId

      // The webhook is the authority for these, but it can land after the
      // browser gets here. Writing them now means /succes can state the real
      // billing terms instead of assuming monthly, and the dashboard is correct
      // on the very first render rather than a moment later.
      interval = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annual" : "monthly"
      user.subscriptionInterval = interval
      user.subscriptionStatus = subscription.status
      if (!user.subscriptionStartedAt) {
        user.subscriptionStartedAt = new Date(subscription.created * 1000)
      }
    } else {
      // If the user has a Stripe customer ID, check for active subscriptions
      if (user.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          user.subscribed = true
          user.stripeSubscriptionId = subscriptions.data[0].id
          interval =
            subscriptions.data[0].items.data[0]?.price.recurring?.interval === "year"
              ? "annual"
              : "monthly"
          user.subscriptionInterval = interval
        }
      }
    }

    await user.save()

    return NextResponse.json({
      success: true,
      subscribed: user.subscribed,
      interval,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error verifying subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
