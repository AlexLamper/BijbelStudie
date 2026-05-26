import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { authOptions } from "../../../lib/authOptions"
import { isAdminEmail } from "../../../lib/adminEmails"

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

    const isAdmin = user.isAdmin || isAdminEmail(session.user.email);
    const userObj = user.toObject ? user.toObject() : { ...user };
    if (isAdmin) userObj.subscribed = true;
    return NextResponse.json({ user: userObj }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ message: "Error fetching user" }, { status: 500 })
  }
}
