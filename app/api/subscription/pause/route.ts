import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import stripe from "../../../../lib/stripe"

/**
 * Pauses billing instead of cancelling. Devotional use is seasonal, so a large
 * share of cancellations are "not right now" rather than "never again"; pausing
 * turns a permanent loss into a temporary one.
 *
 * Security: the subscription id is read from the authenticated user's own
 * record, never from the request. A caller therefore cannot pause or resume
 * anyone else's subscription by guessing an id.
 */

const ALLOWED_MONTHS = [1, 2, 3] as const

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const months = Number((body as { months?: unknown }).months)

    if (!ALLOWED_MONTHS.includes(months as 1 | 2 | 3)) {
      return NextResponse.json({ error: "Ongeldige duur" }, { status: 400 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })

    if (!user?.stripeSubscriptionId) {
      return NextResponse.json({ error: "Geen actief abonnement" }, { status: 400 })
    }

    const resumesAt = new Date()
    resumesAt.setMonth(resumesAt.getMonth() + months)

    // `void` keeps the unpaid invoices from piling up to be collected on resume,
    // which is what the user expects from "pause" - they are not buying the
    // paused months retroactively.
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      pause_collection: {
        behavior: "void",
        resumes_at: Math.floor(resumesAt.getTime() / 1000),
      },
    })

    // The webhook writes the authoritative state; this keeps the UI correct in
    // the interim.
    user.pausedUntil = resumesAt
    await user.save()

    return NextResponse.json({ success: true, resumesAt })
  } catch (error) {
    console.error("[subscription/pause] Failed:", error)
    return NextResponse.json({ error: "Pauzeren mislukt" }, { status: 500 })
  }
}

/** Resumes a paused subscription immediately. */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })

    if (!user?.stripeSubscriptionId) {
      return NextResponse.json({ error: "Geen abonnement" }, { status: 400 })
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      pause_collection: null,
    })

    user.pausedUntil = null
    await user.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[subscription/pause] Resume failed:", error)
    return NextResponse.json({ error: "Hervatten mislukt" }, { status: 500 })
  }
}
