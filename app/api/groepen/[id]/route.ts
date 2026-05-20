import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import StudyGroup from "../../../../models/StudyGroup"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()

  const group = await StudyGroup.findById(params.id)
    .populate("createdBy", "name image")
    .populate("members.userId", "name image")
    .populate("planId")
    .lean()

  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  return NextResponse.json({ group })
}

// PATCH — update group settings (leader only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()

  const callerUser = await (await import("../../../../models/User")).default
    .findOne({ email: session.user.email })
    .lean() as unknown as { _id: { toString(): string } } | null
  if (!callerUser) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const callerId = callerUser._id.toString()

  const group = await StudyGroup.findById(params.id).lean() as unknown as {
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
    params.id,
    { $set: updates },
    { new: true }
  )
    .populate("createdBy", "name image")
    .populate("members.userId", "name image")
    .populate("planId")
    .lean()

  return NextResponse.json({ group: updated })
}
