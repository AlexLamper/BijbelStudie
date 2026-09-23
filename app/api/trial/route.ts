import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { resolveIsPro, type PremiumUserFields } from "../../../lib/mobilePremium"
import { isAdminEmail } from "../../../lib/adminEmails"
import { PRO_TRIAL_DAYS } from "../../../lib/promo"
import {
  resolveTrialEligibility,
  TRIAL_USER_FIELDS,
  type TrialUserFields,
} from "../../../lib/trialEligibility"

export const dynamic = "force-dynamic"

/**
 * GET - may this visitor be offered the free Pro trial?
 *
 * Read by the Pro offer dialog and the pricing page before either one says
 * "7 dagen gratis", so the promise on screen is the one app/api/checkout will
 * keep: both go through lib/trialEligibility.ts. A guest is offered the trial
 * (a new account has never had one); the check that binds happens at checkout,
 * after sign-up.
 *
 * Called only when an offer is about to be shown, never on page load - the
 * Stripe lookup inside is a network round trip.
 */
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ signedIn: false, isPro: false, eligible: true, trialDays: PRO_TRIAL_DAYS })
  }

  await connectMongoDB()
  const user = await User.findOne({ email })
    .select(`${TRIAL_USER_FIELDS} subscribed isAdmin`)
    .lean<TrialUserFields & PremiumUserFields>()
  if (!user) {
    return NextResponse.json({ signedIn: false, isPro: false, eligible: true, trialDays: PRO_TRIAL_DAYS })
  }

  const isPro = resolveIsPro(user, isAdminEmail(email))
  const eligible = isPro ? false : await resolveTrialEligibility(user)

  return NextResponse.json(
    { signedIn: true, isPro, eligible, trialDays: PRO_TRIAL_DAYS },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
