import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "../../../../lib/authOptions"
import connectMongoDB from "../../../../lib/mongodb"
import User from "../../../../models/User"
import { submitResponse } from "../../../../lib/feedbackService"
import { toRouteKey } from "../../../../lib/analyticsRoutes"
import { isStepKey } from "../../../../lib/studyFlow"

export const dynamic = "force-dynamic"

/**
 * One prompted answer.
 *
 * `{ promptId, token, answers: { keuze?, antwoord?, toelichting? }, context? }`
 *
 * There is no anonymous path here, unlike the unprompted form: a prompted
 * answer is only interpretable together with the state of the reader who gave
 * it (their segment, their lesson, whether they got the quiz question right),
 * and the token that authorises it is issued per user in the first place.
 *
 * Everything the client may say about its own context is bounded here: the
 * study id and day are short strings and an integer, the step key must be a
 * real step, and the path is folded to a route key before it is stored. No
 * client-chosen free text reaches Mongo except the answer itself, which is
 * length-capped by the registry.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ message: "Ongeldige aanvraag" }, { status: 400 })

  const promptId = typeof body.promptId === "string" ? body.promptId : ""
  if (!promptId) return NextResponse.json({ message: "promptId is verplicht" }, { status: 400 })

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>()
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

  const raw = (body.context ?? {}) as Record<string, unknown>
  const lessonDay = Number(raw.lessonDay)
  const context = {
    routeKey: toRouteKey(raw.path),
    studyId: typeof raw.studyId === "string" ? raw.studyId.slice(0, 100) : null,
    lessonDay: Number.isInteger(lessonDay) ? lessonDay : null,
    stepKey: isStepKey(raw.stepKey) ? raw.stepKey : null,
    quizId: typeof raw.quizId === "string" ? raw.quizId.slice(0, 200) : null,
    quizQuestionId: typeof raw.quizQuestionId === "string" ? raw.quizQuestionId.slice(0, 200) : null,
    answeredCorrectly: typeof raw.answeredCorrectly === "boolean" ? raw.answeredCorrectly : null,
    platform: "web" as const,
  }

  const result = await submitResponse({
    userId: String(user._id),
    promptId,
    token: body.token,
    answers: body.answers,
    context,
  })

  if (result.ok === true) return NextResponse.json({ ok: true }, { status: 201 })

  // A bad token is the interesting failure: it means an answer arrived for a
  // prompt this reader was not served. It is refused rather than stored,
  // because a poisoned denominator is worse than a lost answer.
  return NextResponse.json(
    { error: result.code },
    { status: result.code === "BAD_TOKEN" ? 403 : 400 },
  )
}
