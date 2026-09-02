import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import {
  canonicaliseReadChapters,
  readChaptersFrom,
  unreadableBookKeys,
} from "../../../../lib/readChaptersCanon"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoDB()
    // `.lean()`, deliberately. Hydrating this document casts `readChapters`
    // against its `Map of [Number]` schema, and one uncastable key there does
    // not raise - it leaves the whole field `undefined`, which is what made
    // this endpoint answer `{}` to a reader with 34 books open. Raw, a bad key
    // costs only itself. See lib/readChaptersCanon `readChaptersFrom`.
    const user = await User.findOne({ email: session.user.email }, { readChapters: 1 }).lean<{
      _id: unknown
      readChapters?: unknown
    }>()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const stored = readChaptersFrom(user.readChapters)

    // Repair rather than only read around it: while the bad key sits there the
    // field stays unhydratable, so every other caller that loads the user as a
    // document keeps seeing no reading progress at all.
    const broken = unreadableBookKeys(user.readChapters)
    if (broken.length > 0) {
      await User.updateOne({ _id: user._id }, { $set: { readChapters: stored } })
      console.warn(
        `[reading-progress] Ongeldige readChapters-sleutels hersteld: ${broken.join(", ")}`,
      )
    }

    return NextResponse.json({ readChapters: canonicaliseReadChapters(stored) })
  } catch (err) {
    console.error("[reading-progress]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
