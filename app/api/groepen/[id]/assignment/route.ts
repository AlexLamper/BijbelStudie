import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"

async function requireLeader(email: string, groupId: string) {
  const user = await User.findOne({ email }).lean() as unknown as { _id: { toString(): string } } | null
  if (!user) return { error: "Gebruiker niet gevonden", status: 404, userId: null, user: null }

  const group = await StudyGroup.findById(groupId).lean() as unknown as {
    _id: unknown;
    members: Array<{ userId: { toString(): string }; role: string }>;
  } | null
  if (!group) return { error: "Groep niet gevonden", status: 404, userId: null, user: null }

  const member = group.members.find(m => m.userId.toString() === user._id.toString())
  if (!member || member.role !== "leader") {
    return { error: "Alleen groepsleiders kunnen dit doen", status: 403, userId: null, user: null }
  }

  return { error: null, status: 200, userId: user._id, user }
}

// POST — set weekly reading assignment (leader only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const auth = await requireLeader(session.user.email, id)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { book, chapter, title, dueDate } = body

  if (!book?.trim()) return NextResponse.json({ error: "Boek is verplicht" }, { status: 400 })
  if (!chapter || typeof chapter !== "number") return NextResponse.json({ error: "Hoofdstuk is verplicht" }, { status: 400 })

  const updated = await StudyGroup.findByIdAndUpdate(
    id,
    {
      $set: {
        weeklyAssignment: {
          book: book.trim(),
          chapter,
          title: title?.trim() ?? "",
          setBy:   auth.userId,
          setAt:   new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      },
    },
    { new: true }
  )
    .populate("weeklyAssignment.setBy", "name")
    .lean()

  return NextResponse.json({ weeklyAssignment: (updated as Record<string, unknown>)?.weeklyAssignment ?? null })
}

// DELETE — clear weekly assignment (leader only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const auth = await requireLeader(session.user.email, id)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  await StudyGroup.findByIdAndUpdate(id, { $unset: { weeklyAssignment: "" } })

  return NextResponse.json({ message: "Opdracht verwijderd" })
}
