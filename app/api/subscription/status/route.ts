import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { reconcileUserFromStripe } from "../../../../lib/subscriptionSync"

/**
 * The caller's own subscription state, re-derived from Stripe.
 *
 * This is the self-heal path: if a webhook delivery was ever missed, dropped or
 * rejected, the next time the user loads a billing surface their state is pulled
 * from Stripe and written back. It shares lib/subscriptionSync with the webhook,
 * so the two cannot disagree about what "subscribed" means - and it writes with
 * `updateOne` rather than `save()`, so an unrelated corrupt field on the user
 * document cannot make it throw.
 *
 * No Stripe identifiers are returned to the browser. They are account-linking
 * material and the client has no use for them.
 */

async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean<{ _id: unknown }>()
  return user ? String(user._id) : null
}

export async function GET() {
  try {
    const userId = await currentUserId()
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const result = await reconcileUserFromStripe(userId)
    if (!result.matched) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      subscribed: result.snapshot?.subscribed ?? false,
      status: result.snapshot?.subscriptionStatus ?? null,
      interval: result.snapshot?.subscriptionInterval ?? null,
      currentPeriodEnd: result.snapshot?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: result.snapshot?.cancelAtPeriodEnd ?? false,
      // Present so the caller can tell "we corrected something" from "already
      // correct" without exposing the values themselves.
      repaired: result.changed.length > 0,
    })
  } catch (error) {
    console.error("[subscription/status] Failed:", error)
    return NextResponse.json({ error: "Error checking subscription status" }, { status: 500 })
  }
}

/** Manual re-sync. Same work as GET; kept because the settings screen posts to it. */
export async function POST() {
  try {
    const userId = await currentUserId()
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const result = await reconcileUserFromStripe(userId)
    if (!result.matched) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Subscription status synced successfully",
      subscribed: result.snapshot?.subscribed ?? false,
      status: result.snapshot?.subscriptionStatus ?? null,
      interval: result.snapshot?.subscriptionInterval ?? null,
      repaired: result.changed.length > 0,
    })
  } catch (error) {
    console.error("[subscription/status] Sync failed:", error)
    return NextResponse.json({ error: "Error syncing subscription status" }, { status: 500 })
  }
}
