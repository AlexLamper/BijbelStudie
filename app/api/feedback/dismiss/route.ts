import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { recordDismiss } from "../../../../lib/feedbackService"

export const dynamic = "force-dynamic"

/**
 * "Sla over".
 *
 * A skip is recorded, not ignored: a question that is skipped far more often
 * than it is answered is a badly worded question, and that is only visible if
 * the skips are counted. The budget was already spent when the prompt was
 * served, so this call does not spend it again - it only says what happened.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const promptId = typeof body.promptId === "string" ? body.promptId : ""
  if (!promptId) return NextResponse.json({ message: "promptId is verplicht" }, { status: 400 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>()
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

  const known = await recordDismiss(String(user._id), promptId)
  if (!known) return NextResponse.json({ message: "Onbekende prompt" }, { status: 400 })

  return NextResponse.json({ ok: true }, { status: 200 })
}
