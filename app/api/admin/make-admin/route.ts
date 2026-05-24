import { NextResponse } from "next/server"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { getServerSession } from "next-auth"
import { isAdminEmail } from "../../../../lib/adminEmails"

// This route is for making a user an admin (should only be accessible by existing admins)
export async function POST(req: Request) {
  try {
    // Check for admin authentication
    const session = await getServerSession()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    await connectMongoDB()

    // Check if the requester is an admin
    const requester = await User.findOne({ email: session.user.email })

    if ((!requester || !requester.isAdmin) && !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 })
    }

    // Get the email of the user to make admin from the request body
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find the user and make them an admin
    const user = await User.findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user to be an admin
    user.isAdmin = true
    await user.save()

    return NextResponse.json({
      message: `Successfully made ${email} an admin`,
    })
  } catch (error) {
    console.error("Error making user an admin:", error)
    return NextResponse.json({ error: "Failed to make user an admin" }, { status: 500 })
  }
}
