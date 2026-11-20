import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { resolveIsPro, type PremiumUserFields } from "../../../lib/mobilePremium"
import { isAdminEmail } from "../../../lib/adminEmails"
import {
  resolveTrialEligibility,
  TRIAL_USER_FIELDS,
  type TrialUserFields,
} from "../../../lib/trialEligibility"

export const dynamic = "force-dynamic"

/**
 * GET - may this visitor be offered the free Pro trial?
 *
 * Since 20 November 2026 the answer is always no: there is no trial
 * (lib/promo.ts). The route stays, and keeps its shape
 * (`{ signedIn, isPro, eligible, trialDays }`), because the pricing page, the
 * Pro offer dialog and the app all read it before deciding what to put on a
 * button - `eligible: false` is what turns "Probeer 7 dagen gratis" into
 * "Word Pro" in all three at once, and an older app build that still asks gets
 * a truthful answer rather than a 404.
 *
 * `eligible` comes from lib/trialEligibility.ts rather than from a literal, so
 * this route cannot promise something app/api/checkout would not do. Note that
 * a guest is now told `false` too: it used to be `true` on the grounds that a
 * new account has never had a trial.
 */
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ signedIn: false, isPro: false, eligible: false, trialDays: 0 })
  }

  await connectMongoDB()
  const user = await User.findOne({ email })
    .select(`${TRIAL_USER_FIELDS} subscribed isAdmin`)
    .lean<TrialUserFields & PremiumUserFields>()
  if (!user) {
    return NextResponse.json({ signedIn: false, isPro: false, eligible: false, trialDays: 0 })
  }

  const isPro = resolveIsPro(user, isAdminEmail(email))
  const eligible = isPro ? false : await resolveTrialEligibility(user)

  return NextResponse.json(
    { signedIn: true, isPro, eligible, trialDays: 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
