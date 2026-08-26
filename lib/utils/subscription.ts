import connectMongoDB from "../mongodb"
import User from "../../models/User"
import { reconcileUserFromStripe } from "../subscriptionSync"

/**
 * Thin wrappers kept for their existing call signature. The implementation moved
 * to lib/subscriptionSync, which is the single place Stripe state is written.
 *
 * These functions used to load the user with `findById` and call `save()`. That
 * validates the whole document, so an unrelated invalid field made them throw -
 * and because both swallow errors, the result was a silent "not subscribed" for
 * a paying customer. They now go through the same `updateOne` path as the
 * webhook.
 */

/** True if Stripe currently entitles this user. Also repairs the local flag. */
export async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const result = await reconcileUserFromStripe(userId)
    return result.snapshot?.subscribed ?? false
  } catch (error) {
    console.error("Error checking user subscription:", error)
    return false
  }
}

/** Re-derives this user's billing state from Stripe and returns the fresh record. */
export async function syncUserSubscription(userId: string) {
  const result = await reconcileUserFromStripe(userId)
  if (!result.matched) throw new Error("User not found")

  await connectMongoDB()
  return User.findById(userId)
    .select("email subscribed subscriptionStatus subscriptionInterval stripeCustomerId stripeSubscriptionId")
    .lean()
}
