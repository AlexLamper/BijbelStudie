import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import stripe from "../../../../lib/stripe"

/**
 * Opens the Stripe Billing Portal so a user can update the card behind a failed
 * payment. This is what makes the dunning banner actionable - without a
 * one-click route to fixing the card, most involuntary churn is unrecoverable.
 *
 * Security: the portal session is created for the customer id stored on the
 * authenticated user's record. Nothing is read from the request, so a caller
 * cannot open a portal session against another customer - which would expose
 * that customer's invoices and payment methods.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email }).select("stripeCustomerId")

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "Geen factuurgegevens gevonden" }, { status: 400 })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: "https://bijbelstudie.io/instellingen",
    })

    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error("[subscription/portal] Failed:", error)
    return NextResponse.json({ error: "Kon het factuurportaal niet openen" }, { status: 500 })
  }
}
