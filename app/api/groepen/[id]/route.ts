import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import StudyGroup from "../../../../models/StudyGroup"
import User from "../../../../models/User"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()

  const caller = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean<{ _id: { toString(): string } }>()
  if (!caller) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const group = await StudyGroup.findById(id)
    .populate("createdBy", "name image")
    .populate("members.userId", "name image")
    .populate("planId")
    .lean<{
      _id: unknown
      name: string
      description: string
      isPublic: boolean
      inviteCode?: string
      createdBy?: unknown
      members: Array<{ userId?: { _id?: { toString(): string } } | null }>
      createdAt?: Date
    }>()

  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const callerId = caller._id.toString()
  const isMember = group.members.some(
    m => m.userId?._id?.toString() === callerId
  )

  // A private group is invisible to outsiders: 404 rather than 403, so the
  // response does not confirm that the id exists.
  if (!isMember && !group.isPublic) {
    return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })
  }

  // A public group is discoverable from /groepen, but its contents - the
  // discussion, the shared notes, the member list, the invite code - are for
  // members. Joining happens on the list page, not here.
  if (!isMember) {
    return NextResponse.json(
      { error: "U bent geen lid van deze groep" },
      { status: 403 }
    )
  }

  return NextResponse.json({ group, isMember: true })
}

// PATCH — update group settings (leader only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()

  const callerUser = await (await import("../../../../models/User")).default
    .findOne({ email: session.user.email })
    .lean() as unknown as { _id: { toString(): string } } | null
  if (!callerUser) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const callerId = callerUser._id.toString()

  const group = await StudyGroup.findById(id).lean() as unknown as {
    members: Array<{ userId: { toString(): string }; role: string }>;
  } | null
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const member = group.members.find(m => m.userId.toString() === callerId)
  if (!member || member.role !== "leader") {
    return NextResponse.json({ error: "Alleen groepsleiders kunnen instellingen aanpassen" }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.description === "string") updates.description = body.description.trim()
  if (typeof body.isPublic === "boolean") updates.isPublic = body.isPublic

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Geen velden om bij te werken" }, { status: 400 })
  }

  const updated = await StudyGroup.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true }
  )
    .populate("createdBy", "name image")
    .populate("members.userId", "name image")
    .populate("planId")
    .lean()

  return NextResponse.json({ group: updated })
}
