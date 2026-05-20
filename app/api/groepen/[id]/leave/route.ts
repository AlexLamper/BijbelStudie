import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).lean()
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })

  const userId = (user as { _id: { toString(): string } })._id.toString()
  const group  = await StudyGroup.findById(id)
  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const member = group.members.find(
    (m: { userId: { toString(): string }; role: string }) => m.userId.toString() === userId
  )
  if (!member) return NextResponse.json({ error: "U bent geen lid van deze groep" }, { status: 400 })
  if (member.role === "leader" && group.members.filter((m: { role: string }) => m.role === "leader").length === 1) {
    return NextResponse.json({ error: "De enige leider kan de groep niet verlaten. Verwijder de groep of wijs een nieuwe leider aan." }, { status: 400 })
  }

  group.members = group.members.filter(
    (m: { userId: { toString(): string } }) => m.userId.toString() !== userId
  )
  await group.save()

  return NextResponse.json({ message: "U heeft de groep verlaten" })
}
