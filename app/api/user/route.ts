import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { authOptions } from "../../../lib/authOptions"
import { isAdminEmail } from "../../../lib/adminEmails"
import { resolveIsPro } from "../../../lib/mobilePremium"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectMongoDB()

    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Entitlement is resolved through the one helper the session, /api/v1/me and
    // the settings billing-state all use, so every surface answers the same way.
    // Reading `subscribed` on its own only ever sees Stripe, which left a
    // RevenueCat/App Store subscriber rendered as a free account.
    const adminByEmail = isAdminEmail(session.user.email);
    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.subscribed = resolveIsPro(userObj, adminByEmail);
    return NextResponse.json({ user: userObj }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ message: "Error fetching user" }, { status: 500 })
  }
}
