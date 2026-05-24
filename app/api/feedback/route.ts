import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import Feedback from "../../../models/Feedback"

const ALLOWED_CATEGORIES = new Set(["bug", "feature", "praise", "other"])

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message || message.length < 4) {
    return NextResponse.json({ error: "Bericht is te kort" }, { status: 400 })
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Bericht is te lang (max 4000 tekens)" }, { status: 400 })
  }

  const categoryRaw = typeof body.category === "string" ? body.category : "other"
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "other"
  const rating =
    typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : undefined
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : ""

  await connectMongoDB()

  let userId: unknown = undefined
  let name = typeof body.name === "string" ? body.name.slice(0, 120) : ""
  let email = typeof body.email === "string" ? body.email.slice(0, 200) : ""

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      const u = await User.findOne({ email: session.user.email }).select("_id name email")
      if (u) {
        userId = u._id
        name = u.name || name
        email = u.email || email
      }
    }
  } catch {
    // anonymous submission is fine
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || ""

  await Feedback.create({
    userId,
    name,
    email,
    category,
    rating,
    message,
    page,
    userAgent,
  })

  return NextResponse.json({ ok: true })
}
