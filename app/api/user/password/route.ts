import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { consume } from "../../../../lib/rateLimit"
import { BCRYPT_ROUNDS, newPasswordError } from "../../../../lib/passwordRules"

export const runtime = "nodejs"

/**
 * Wachtwoord wijzigen, from /instellingen -> Account.
 *
 * GET  -> { hasPassword, google, apple }. Never the hash.
 * POST { currentPassword, newPassword, confirmPassword }
 *
 * An account without a password (Google or Apple only) cannot set one here:
 * /api/auth/forgot-password deliberately refuses those accounts too, so there
 * is no credentials login to add a password to. The page explains that instead.
 *
 * The write is one `updateOne` with `$set: { password }` and the reset-token
 * cleanup the reset route also does - never a save() of a hydrated User
 * (see CLAUDE.md, data safety).
 */

/** Per account: a handful of attempts, so the current-password check cannot be brute-forced. */
const PER_USER = { scope: "user-password", limit: 5, windowMs: 15 * 60 * 1000 }

type PasswordUser = {
  _id: unknown
  password?: string | null
  googleId?: string | null
  appleId?: string | null
}

async function loadUser(email: string): Promise<PasswordUser | null> {
  await connectMongoDB()
  return User.findOne({ email: email.trim().toLowerCase() })
    .select("password googleId appleId")
    .lean<PasswordUser>()
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
      google: Boolean(user.googleId),
      apple: Boolean(user.appleId),
    })
  } catch (err) {
    console.error("[user/password GET]", err)
    return NextResponse.json({ error: "Er ging iets mis. Probeer het opnieuw." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
    }

    let body: { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 })
    }
    const { currentPassword, newPassword, confirmPassword } = body ?? {}

    const ruleError = newPasswordError(newPassword)
    if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 })
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "De nieuwe wachtwoorden komen niet overeen." }, { status: 400 })
    }

    // Counted before the bcrypt compare, so a wrong guess costs budget.
    if (consume(PER_USER, session.user.email.trim().toLowerCase()).limited) {
      return NextResponse.json(
        { error: "Te veel pogingen. Probeer het over een kwartier opnieuw." },
        { status: 429 },
      )
    }

    const user = await loadUser(session.user.email)
    if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

    if (!user.password) {
      return NextResponse.json(
        { error: "Je account heeft geen wachtwoord. Je logt in via Google of Apple." },
        { status: 400 },
      )
    }

    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: "Je huidige wachtwoord klopt niet." }, { status: 403 })
    }

    if (await bcrypt.compare(newPassword as string, user.password)) {
      return NextResponse.json(
        { error: "Kies een nieuw wachtwoord dat anders is dan je huidige." },
        { status: 400 },
      )
    }

    const hashed = await bcrypt.hash(newPassword as string, BCRYPT_ROUNDS)
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashed },
        // A reset link requested earlier must not still work after a change.
        $unset: { resetToken: "", resetTokenExpires: "" },
      },
    )

    return NextResponse.json({ message: "Je wachtwoord is gewijzigd." })
  } catch (err) {
    console.error("[user/password POST]", err)
    return NextResponse.json({ error: "Er ging iets mis. Probeer het opnieuw." }, { status: 500 })
  }
}
