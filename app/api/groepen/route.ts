import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import StudyGroup from "../../../models/StudyGroup"
import User from "../../../models/User"

function generateCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// GET — list public groups + caller's groups
// ?mine=true returns only the caller's groups (minimal fields for dropdowns)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = (user as { _id: { toString(): string } })._id.toString()

  const myGroups = await StudyGroup.find({ "members.userId": userId })
    .sort({ updatedAt: -1 })
    .populate("createdBy", "name image")
    .lean()

  // Minimal response for note-modal dropdowns
  if (req.nextUrl.searchParams.get("mine") === "true") {
    return NextResponse.json({
      groups: myGroups.map((g: Record<string, unknown>) => ({ _id: g._id, name: g.name })),
    })
  }

  const publicGroups = await StudyGroup.find({ isPublic: true })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("createdBy", "name image")
    .lean()

  return NextResponse.json({ publicGroups, myGroups })
}

// POST — create a group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  const body = await req.json()
  const { name, description, isPublic, planId } = body

  if (!name?.trim()) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = (user as { _id: unknown; subscribed?: boolean })._id

  if (!(user as { subscribed?: boolean }).subscribed) {
    return NextResponse.json(
      { error: "Upgrade naar Premium om een studiegroep aan te maken.", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    )
  }

  // Generate unique invite code
  let inviteCode = generateCode()
  let exists = await StudyGroup.findOne({ inviteCode })
  while (exists) { inviteCode = generateCode(); exists = await StudyGroup.findOne({ inviteCode }) }

  const group = await StudyGroup.create({
    name: name.trim(),
    description: description?.trim() || "",
    isPublic:   isPublic !== false,
    inviteCode,
    createdBy:  userId,
    members:    [{ userId, role: "leader" }],
    planId:     planId || null,
  })

  return NextResponse.json({ group }, { status: 201 })
}
