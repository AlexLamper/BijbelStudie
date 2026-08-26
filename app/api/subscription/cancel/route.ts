import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import AnalyticsEvent from "../../../../models/AnalyticsEvent"
import stripe from "../../../../lib/stripe"
import { tenureBucket } from "../../../../lib/analyticsSchema"
import { periodEndOf } from "../../../../lib/subscriptionSync"

/**
 * Cancels at period end and records why, if the user says why.
 *
 * The reason is deliberately optional. Dutch and EU consumer law requires
 * cancelling to be no harder than subscribing, so nothing in this route may
 * stand between the user and the cancellation - an unrecognised or absent
 * reason is stored as "unspecified" instead of returning an error.
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

    const cancelReason: Reason | undefined = isReason(reason) ? reason : undefined

    await connectMongoDB()
    // Narrow projection + `.lean()`: this route must not hydrate or validate the
    // whole user document. One corrupt unrelated field would otherwise make
    // cancelling impossible, which is exactly what the law here forbids.
    const user = await User.findOne({ email: session.user.email })
      .select("subscribed stripeSubscriptionId subscriptionStartedAt createdAt")
      .lean<{
        _id: unknown
        subscribed?: boolean
        stripeSubscriptionId?: string | null
        subscriptionStartedAt?: Date | null
        createdAt?: Date
      }>()

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
      cancellation_details: { feedback: mapToStripeFeedback(cancelReason) },
    })

    // Read through the shared helper: `current_period_end` moved from the
    // subscription onto its items in a later Stripe API version, and reading only
    // the old location produced `new Date(NaN)` as the cancellation date.
    const currentPeriodEnd = periodEndOf(subscription)

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          cancelAtPeriodEnd: true,
          cancellationReason: cancelReason ?? null,
          cancellationFeedback:
            typeof feedback === "string" ? feedback.slice(0, MAX_FEEDBACK_CHARS) : null,
        },
      }
    )

    // Recorded server-side so it cannot be lost to a closed tab or an ad blocker.
    const startedAt = user.subscriptionStartedAt ?? user.createdAt ?? new Date()
    const tenureDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000)
    )

    await AnalyticsEvent.create({
      name: "subscription_canceled",
      userId: user._id,
      props: { reason: cancelReason ?? "unspecified", tenure: tenureBucket(tenureDays) },
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
  reason: Reason | undefined
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
