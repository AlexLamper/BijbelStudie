import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import AnalyticsEvent from "../../../../models/AnalyticsEvent"
import stripe from "../../../../lib/stripe"
import { tenureBucket } from "../../../../lib/analyticsSchema"

/**
 * Cancels at period end and records why. The reason is the input every later
 * retention decision depends on, so it is captured here rather than in an
 * optional survey the user can skip.
 *
 * Security: the subscription id comes from the authenticated user's own record.
 * The free-text field is length-capped and stored as data only - it is never
 * interpolated into a query, a template or a log line.
 */

const REASONS = [
  "too_expensive",
  "not_using",
  "missing_features",
  "technical_problems",
  "temporary_break",
  "other",
] as const

type Reason = (typeof REASONS)[number]

const MAX_FEEDBACK_CHARS = 1000

function isReason(value: unknown): value is Reason {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { reason, feedback } = body as { reason?: unknown; feedback?: unknown }

    if (!isReason(reason)) {
      return NextResponse.json({ error: "Geef een reden op" }, { status: 400 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    if (!user.subscribed || !user.stripeSubscriptionId) {
      return NextResponse.json({ error: "Geen actief abonnement" }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
      // Stripe's own cancellation analytics, so the reason is visible in the
      // Dashboard alongside the churn numbers rather than only in our database.
      cancellation_details: { feedback: mapToStripeFeedback(reason) },
    })

    const currentPeriodEnd = new Date(
      (subscription as unknown as { current_period_end: number }).current_period_end * 1000
    )

    user.cancelAtPeriodEnd = true
    user.cancellationReason = reason
    user.cancellationFeedback =
      typeof feedback === "string" ? feedback.slice(0, MAX_FEEDBACK_CHARS) : undefined
    await user.save()

    // Recorded server-side so it cannot be lost to a closed tab or an ad blocker.
    const startedAt = user.subscriptionStartedAt ?? user.createdAt ?? new Date()
    const tenureDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000)
    )

    await AnalyticsEvent.create({
      name: "subscription_canceled",
      userId: user._id,
      props: { reason, tenure: tenureBucket(tenureDays) },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Je abonnement loopt door tot het einde van de periode",
      cancelDate: currentPeriodEnd,
    })
  } catch (error) {
    console.error("[subscription/cancel] Failed:", error)
    return NextResponse.json({ error: "Opzeggen mislukt" }, { status: 500 })
  }
}

/** Maps our reasons onto Stripe's fixed cancellation feedback vocabulary. */
function mapToStripeFeedback(
  reason: Reason
): "too_expensive" | "unused" | "missing_features" | "other" {
  switch (reason) {
    case "too_expensive":
      return "too_expensive"
    case "not_using":
    case "temporary_break":
      return "unused"
    case "missing_features":
      return "missing_features"
    default:
      return "other"
  }
}
