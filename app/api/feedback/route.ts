import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import Feedback from "../../../models/Feedback"
import { clientIp, consume } from "../../../lib/rateLimit"

const ALLOWED_CATEGORIES = new Set(["bug", "feature", "praise", "other"])

/**
 * The unprompted feedback form (`/feedback`).
 *
 * This route used to accept `name` and `email` straight from the request body
 * for an unauthenticated caller, with no rate limit - an open write path into
 * the owner's admin inbox that could also attribute a submission to any name
 * and address the sender chose. Both are fixed here:
 *
 * - identity comes from the session or not at all. An anonymous submission may
 *   still leave a reply address, but it is stored as `contactName` /
 *   `contactEmail`, which the admin view is expected to present as
 *   self-reported rather than as the author's account.
 * - budgets per IP and per account, plus a body cap and a honeypot.
 *
 * The limits are in-memory and per instance (see `lib/rateLimit.ts`). That is
 * deliberate for this route: the cost of a false negative is one extra row in
 * a table the owner reads by hand, and the alternative is a Redis dependency
 * for a contact form.
 */

/** 5 per IP per hour. Generous enough for someone reporting two bugs in a row. */
const PER_IP = { scope: "feedback:ip", limit: 5, windowMs: 60 * 60 * 1000 }
/** 20 per account per day, so a signed-in enthusiast is never the problem. */
const PER_USER = { scope: "feedback:user", limit: 20, windowMs: 24 * 60 * 60 * 1000 }

const MAX_BODY_BYTES = 16 * 1024
const MAX_MESSAGE_LENGTH = 4000
const MIN_MESSAGE_LENGTH = 4

/**
 * Strips control characters while keeping tab, newline and carriage return -
 * the message is a textarea and its line breaks are meaningful.
 */
function stripControlChars(value: string): string {
  let out = ""
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    const isTabOrNewline = code === 9 || code === 10 || code === 13
    if (isTabOrNewline || (code >= 32 && code !== 127)) out += ch
  }
  return out
}

export async function POST(request: Request) {
  // Reject an oversized body before parsing it, so a large payload costs
  // nothing to refuse.
  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Bericht is te lang" }, { status: 413 })
  }

  if (consume(PER_IP, clientIp(request)).limited) {
    return NextResponse.json(
      { error: "Je hebt net al feedback gestuurd. Probeer het later opnieuw." },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Bericht is te lang" }, { status: 413 })
    }
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 })
  }

  // Honeypot. A bot fills every field it finds; a person never sees this one.
  // Answer 200 and write nothing - a 400 here just teaches the bot which field
  // to leave alone next time.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true })
  }

  const message = stripControlChars(
    typeof body.message === "string" ? body.message.trim() : "",
  )
  if (!message || message.length < MIN_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Bericht is te kort" }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Bericht is te lang (max ${MAX_MESSAGE_LENGTH} tekens)` },
      { status: 400 },
    )
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
  let name = ""
  let email = ""
  let contactName = ""
  let contactEmail = ""

  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      const u = await User.findOne({ email: session.user.email }).select("_id name email")
      if (u) {
        userId = u._id
        // Identity from the database, never from the body.
        name = u.name || ""
        email = u.email || ""
        if (consume(PER_USER, String(u._id)).limited) {
          return NextResponse.json(
            { error: "Je hebt vandaag al veel feedback gestuurd. Bedankt - morgen weer." },
            { status: 429 },
          )
        }
      }
    }
  } catch {
    // An anonymous submission is still worth having.
  }

  // Only when there is no account behind the submission does a self-reported
  // reply address get stored, and then under names that say what it is.
  if (!userId) {
    contactName = typeof body.name === "string" ? stripControlChars(body.name).slice(0, 120) : ""
    contactEmail =
      typeof body.email === "string" ? stripControlChars(body.email).trim().slice(0, 200) : ""
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || ""

  await Feedback.create({
    userId,
    name,
    email,
    contactName,
    contactEmail,
    category,
    rating,
    message,
    page,
    userAgent,
    touchpoint: "unprompted",
  })

  return NextResponse.json({ ok: true })
}
