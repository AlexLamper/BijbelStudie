import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoDB()
    const user = await User.findOne({ email: session.user.email }, { readChapters: 1 })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const readChapters: Record<string, number[]> = {}
    if (user.readChapters) {
      for (const [book, chapters] of user.readChapters.entries()) {
        readChapters[book] = chapters
      }
    }

    return NextResponse.json({ readChapters })
  } catch (err) {
    console.error("[reading-progress]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
