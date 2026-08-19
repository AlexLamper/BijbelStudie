import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"

/**
 * Everything the in-app billing surfaces need, in one call: whether there is a
 * payment problem to warn about, whether the subscription is paused, and whether
 * this user is a candidate for the monthly-to-annual offer.
 *
 * Reads only local state written by the Stripe webhook - no Stripe API call on
 * a page load. Returns nothing that is not already about the caller's own
 * account, and no Stripe identifiers.
 */

/** A monthly subscriber becomes an annual prospect once the habit has held. */
const UPSELL_AFTER_DAYS = 60
/** Ask again no sooner than this after a dismissal. */
const UPSELL_REDISPLAY_DAYS = 90

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email })
      .select(
        "subscribed subscriptionStatus subscriptionInterval currentPeriodEnd cancelAtPeriodEnd billingIssueSince pausedUntil subscriptionStartedAt annualUpsellDismissedAt createdAt"
      )
      .lean<{
        subscribed?: boolean
        subscriptionStatus?: string | null
        subscriptionInterval?: string | null
        currentPeriodEnd?: Date | null
        cancelAtPeriodEnd?: boolean
        billingIssueSince?: Date | null
        pausedUntil?: Date | null
        subscriptionStartedAt?: Date | null
        annualUpsellDismissedAt?: Date | null
        createdAt?: Date
      }>()

    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
    }

    const now = Date.now()
    const isPaused = !!user.pausedUntil && new Date(user.pausedUntil).getTime() > now

    const startedAt = user.subscriptionStartedAt ?? user.createdAt ?? null
    const tenureDays = startedAt
      ? Math.floor((now - new Date(startedAt).getTime()) / 86_400_000)
      : 0

    const dismissedRecently =
      !!user.annualUpsellDismissedAt &&
      now - new Date(user.annualUpsellDismissedAt).getTime() <
        UPSELL_REDISPLAY_DAYS * 86_400_000

    const showAnnualUpsell =
      !!user.subscribed &&
      user.subscriptionInterval === "monthly" &&
      !user.cancelAtPeriodEnd &&
      !isPaused &&
      tenureDays >= UPSELL_AFTER_DAYS &&
      !dismissedRecently

    return NextResponse.json({
      subscribed: !!user.subscribed,
      status: user.subscriptionStatus ?? null,
      interval: user.subscriptionInterval ?? null,
      currentPeriodEnd: user.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: !!user.cancelAtPeriodEnd,
      // Drives the dunning banner. Present means an invoice has failed and
      // Stripe is still retrying - access has not been revoked yet.
      hasBillingIssue: !!user.billingIssueSince,
      billingIssueSince: user.billingIssueSince ?? null,
      isPaused,
      pausedUntil: isPaused ? user.pausedUntil : null,
      showAnnualUpsell,
    })
  } catch (error) {
    console.error("[billing-state] Failed:", error)
    return NextResponse.json({ error: "Kon status niet ophalen" }, { status: 500 })
  }
}
