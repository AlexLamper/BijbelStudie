import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import Note from "../../../../../models/Note"
import User from "../../../../../models/User"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId  = (user as { _id: { toString(): string } })._id.toString()
  const group   = await StudyGroup.findById(params.id).lean()
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isMember = (group as any).members?.some(
    (m: { userId: { toString(): string } }) => m.userId.toString() === userId
  )
  if (!isMember) return NextResponse.json({ error: "Geen toegang" }, { status: 403 })

  // Notes shared with this group — stored with groupId field
  const notes = await Note.find({ groupId: params.id })
    .populate("userId", "name image")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return NextResponse.json({ notes })
}
