import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import StudyGroup from "../../../../models/StudyGroup"
import User from "../../../../models/User"

/**
 * POST /api/groepen/join-by-code — join a group with an invite code.
 * Body: { inviteCode }
 *
 * The invite bar used to resolve the code client-side: it fetched the public
 * group list and looked for a matching `inviteCode`. Private groups are never
 * in that list, so the one flow a private group exists for could not work, and
 * the only way it appeared to work was that public groups shipped their codes
 * to every signed-in user. The lookup belongs on the server, where the code can
 * be matched without publishing it first.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
  }

  const { inviteCode } = await req.json().catch(() => ({ inviteCode: "" }))
  const code = typeof inviteCode === "string" ? inviteCode.trim().toUpperCase() : ""
  if (code.length < 6) {
    return NextResponse.json({ error: "Ongeldige uitnodigingscode" }, { status: 400 })
  }

  await connectMongoDB()

  const user = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean<{ _id: { toString(): string } }>()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const group = await StudyGroup.findOne({ inviteCode: code })
  // Same message whether the code is wrong or the group is gone: a distinct
  // "this code exists but..." reply would turn this into a code oracle.
  if (!group) {
    return NextResponse.json({ error: "Geen groep gevonden met deze code" }, { status: 404 })
  }

  const userId = user._id.toString()
  const alreadyMember = group.members.some(
    (m: { userId: { toString(): string } }) => m.userId.toString() === userId
  )
  if (alreadyMember) {
    return NextResponse.json({ error: "U bent al lid van deze groep" }, { status: 409 })
  }

  group.members.push({ userId: user._id, role: "member", joinedAt: new Date() })
  await group.save()

  return NextResponse.json({ message: "Succesvol lid geworden", groupId: group._id })
}
