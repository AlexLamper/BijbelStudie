import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"

// POST /api/groepen/[id]/join
// Body: { inviteCode? } — required only if group is private
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = (user as { _id: unknown })._id
  const group  = await StudyGroup.findById(params.id)
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  // Check already a member
  const alreadyMember = group.members.some(
    (m: { userId: { toString(): string } }) => m.userId.toString() === userId.toString()
  )
  if (alreadyMember) return NextResponse.json({ error: "U bent al lid van deze groep" }, { status: 409 })

  // Private group requires invite code
  if (!group.isPublic) {
    const { inviteCode } = await req.json().catch(() => ({}))
    if (!inviteCode || inviteCode.toUpperCase() !== group.inviteCode) {
      return NextResponse.json({ error: "Ongeldige uitnodigingscode" }, { status: 403 })
    }
  }

  group.members.push({ userId, role: "member", joinedAt: new Date() })
  await group.save()

  return NextResponse.json({ message: "Succesvol lid geworden" })
}
