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
