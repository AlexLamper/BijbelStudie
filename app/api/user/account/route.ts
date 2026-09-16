import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { consume } from "../../../../lib/rateLimit"
import { isProtectedAccount } from "../../../../lib/accountArchive"
import {
  archiveAndDeleteAccount,
  emailConfirmationMatches,
  hasBillingStripeSubscription,
  ProtectedAccountError,
} from "../../../../lib/accountDeletion"

export const runtime = "nodejs"

/**
 * Account verwijderen, from /instellingen -> Account.
 *
 * GET    -> what the dialog needs: { hasPassword, isProtected, stripeBlocking, storeSubscription }
 * DELETE { email, password? }
 *
 * The same guards as the app's DELETE /api/v1/account, via the same function
 * (lib/accountDeletion.ts): an admin account is refused, and everything is
 * archived into `deletedaccounts` before anything is removed - a failed archive
 * aborts the delete.
 *
 * On top of that, because a web form is easier to reach than an app screen:
 * the account's own email must be typed, the current password is verified when
 * the account has one, and a Stripe subscription that is still billing blocks
 * the delete (accountPurge severs the Stripe link without cancelling, which
 * would keep charging a card with no account behind it).
 *
 * Remember: preview deployments share the production database.
 */

/** Per account. Deleting is a one-time act; a few tries covers typos in the password. */
const PER_USER = { scope: "user-account-delete", limit: 5, windowMs: 60 * 60 * 1000 }

type DeletableUser = {
  _id: unknown
  email?: string | null
  password?: string | null
  isAdmin?: boolean | null
  subscriptionStatus?: string | null
  cancelAtPeriodEnd?: boolean | null
  storePremium?: boolean | null
  storePremiumExpiresAt?: Date | null
}

async function loadUser(email: string): Promise<DeletableUser | null> {
  await connectMongoDB()
  return User.findOne({ email: email.trim().toLowerCase() })
    .select("email password isAdmin subscriptionStatus cancelAtPeriodEnd storePremium storePremiumExpiresAt")
    .lean<DeletableUser>()
}

function storeSubscriptionActive(user: DeletableUser): boolean {
  if (!user.storePremium) return false
  return !user.storePremiumExpiresAt || new Date(user.storePremiumExpiresAt).getTime() > Date.now()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }
    const user = await loadUser(session.user.email)
    if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

    return NextResponse.json({
      hasPassword: Boolean(user.password),
      isProtected: isProtectedAccount(user),
      stripeBlocking: hasBillingStripeSubscription(user),
      storeSubscription: storeSubscriptionActive(user),
    })
  } catch (err) {
    console.error("[user/account GET]", err)
    return NextResponse.json({ error: "Er ging iets mis. Probeer het opnieuw." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    if (consume(PER_USER, session.user.email.trim().toLowerCase()).limited) {
      return NextResponse.json(
        { error: "Te veel pogingen. Probeer het later opnieuw." },
        { status: 429 },
      )
    }

    let body: { email?: unknown; password?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 })
    }

    const user = await loadUser(session.user.email)
    if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

    if (isProtectedAccount(user)) {
      return NextResponse.json(
        { error: "Een beheerdersaccount kan niet worden verwijderd. Haal eerst de beheerdersrol weg." },
        { status: 403 },
      )
    }

    if (!emailConfirmationMatches(body?.email, user.email)) {
      return NextResponse.json(
        { error: "Het e-mailadres komt niet overeen met je account." },
        { status: 400 },
      )
    }

    if (user.password) {
      const password = body?.password
      if (typeof password !== "string" || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: "Je wachtwoord klopt niet." }, { status: 403 })
      }
    }

    if (hasBillingStripeSubscription(user)) {
      return NextResponse.json(
        { error: "Je hebt nog een lopend abonnement. Zeg het eerst op onder Instellingen > Abonnement." },
        { status: 409 },
      )
    }

    // Archive first, then delete; a failed archive throws and nothing is removed.
    await archiveAndDeleteAccount(
      { _id: String(user._id), email: user.email, isAdmin: user.isAdmin },
      { route: "web/account", actor: user.email ?? null, reason: "self-service" },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ProtectedAccountError) {
      return NextResponse.json({ error: "Een beheerdersaccount kan niet worden verwijderd." }, { status: 403 })
    }
    console.error("[user/account DELETE]", err)
    return NextResponse.json(
      { error: "Je account kon niet worden verwijderd. Probeer het later opnieuw of neem contact met ons op." },
      { status: 500 },
    )
  }
}
