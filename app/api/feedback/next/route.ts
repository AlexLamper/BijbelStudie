import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { nextPrompt } from "../../../../lib/feedbackService"
import { TOUCHPOINTS, type Touchpoint } from "../../../../lib/feedbackPrompts"
import { toRouteKey } from "../../../../lib/analyticsRoutes"

export const dynamic = "force-dynamic"

/**
 * "Is there a question for this reader, here, now?"
 *
 * `GET /api/feedback/next?touchpoint=quiz_complete&studyId=opstanding&day=3`
 *
 * Answers `{ prompt: null }` far more often than not, which is the point: the
 * budget in lib/feedbackEligibility.ts allows one prompt per reader per month.
 * Serving a prompt spends that budget, so this is a write as well as a read -
 * do not call it speculatively on page load.
 *
 * The highest-value touchpoint does NOT use this route: the lesson-completion
 * prompt rides along on the response of PATCH /api/v1/study-lesson-state, so
 * the reward screen costs no extra round trip.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const touchpointRaw = url.searchParams.get("touchpoint")
  if (!touchpointRaw || !(TOUCHPOINTS as readonly string[]).includes(touchpointRaw)) {
    return NextResponse.json({ message: "Onbekend touchpoint" }, { status: 400 })
  }
  const touchpoint = touchpointRaw as Touchpoint
  // The unprompted inbox is not something anyone is invited to; it is a page
  // the reader chooses to open.
  if (touchpoint === "unprompted") {
    return NextResponse.json({ prompt: null }, { status: 200 })
  }

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>()
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

  const dayRaw = Number(url.searchParams.get("day"))
  const prompt = await nextPrompt({
    userId: String(user._id),
    touchpoint,
    context: {
      studyId: url.searchParams.get("studyId"),
      lessonDay: Number.isInteger(dayRaw) ? dayRaw : null,
    },
  })

  // `routeKey`, never the raw path: a path carries a book and a chapter, which
  // is more than a feedback row needs to know.
  return NextResponse.json(
    { prompt, routeKey: toRouteKey(url.searchParams.get("path")) },
    { status: 200 },
  )
}
