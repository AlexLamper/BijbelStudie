import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import AnalyticsEvent from "../../../../models/AnalyticsEvent"
import stripe from "../../../../lib/stripe"

/**
 * Switches an existing monthly subscription to annual, crediting the unused
 * part of the current month. A monthly subscriber who has stayed three months is
 * the best annual prospect there is: they have proven the habit, and the switch
 * removes nine future opportunities to churn.
 *
 * Security: takes no parameters at all. The subscription is the caller's own,
 * the target price comes from server configuration, and the only possible
 * outcome is monthly -> annual for the authenticated user.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    const annualPriceId =
      process.env.STRIPE_ANNUAL_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID

    if (!annualPriceId) {
      console.error("[upgrade-annual] No annual price configured")
      return NextResponse.json({ error: "Configuratiefout" }, { status: 500 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })

    if (!user?.stripeSubscriptionId || !user.subscribed) {
      return NextResponse.json({ error: "Geen actief abonnement" }, { status: 400 })
    }

    if (user.subscriptionInterval === "annual") {
      return NextResponse.json({ error: "Je hebt al een jaarabonnement" }, { status: 409 })
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
    const currentItem = subscription.items.data[0]

    if (!currentItem) {
      return NextResponse.json({ error: "Abonnement onvolledig" }, { status: 400 })
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: currentItem.id, price: annualPriceId }],
      // Credits the unused remainder of the current month against the annual
      // charge, and bills the difference now.
      proration_behavior: "always_invoice",
    })

    // The webhook writes the authoritative interval; this avoids a stale UI.
    user.subscriptionInterval = "annual"
    await user.save()

    await AnalyticsEvent.create({
      name: "annual_upsell_accepted",
      userId: user._id,
      props: {},
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[upgrade-annual] Failed:", error)
    return NextResponse.json({ error: "Overstappen mislukt" }, { status: 500 })
  }
}

/** Records a dismissal so the offer is not shown again. */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 })

    user.annualUpsellDismissedAt = new Date()
    await user.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[upgrade-annual] Dismiss failed:", error)
    return NextResponse.json({ error: "Mislukt" }, { status: 500 })
  }
}
