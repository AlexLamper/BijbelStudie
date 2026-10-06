import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import {
  FREEZE_EVERY_DAYS,
  currentStreak,
  startOfDay,
  streakHeldByFreeze,
  type StreakTransition,
} from "../../../lib/streak"
import { touchStreak } from "../../../lib/streakWrite"
import { isAdminEmail } from "../../../lib/adminEmails"
import { resolveIsPro } from "../../../lib/mobilePremium"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email })
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 })
  }
  const state = {
    streak: user.streak,
    freezeCount: user.freezeCount,
    lastStreakDate: user.lastStreakDate,
  }
  // The stored number is a run that may already be over - see lib/streak.
  return NextResponse.json(
    {
      streak: currentStreak(state),
      freezes: user.freezeCount ?? 0,
      freezeHolding: streakHeldByFreeze(state),
    },
    { status: 200 }
  )
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email }).select(
    "streak freezeCount lastStreakDate"
  )
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 })
  }

  // `?test=true` skips every rule and just increments. It is a development
  // aid, but as a production route it let any signed-in user inflate their own
  // streak - and now their badges and XP with it - from the browser console.
  const url = new URL(request.url)
  // Pro through any channel (Stripe, App Store / RevenueCat, admin). Freezes no
  // longer depend on it; XP multipliers still do.
  const isPro = resolveIsPro(user, isAdminEmail(session.user.email))
  const test = url.searchParams.get("test") === "true" && process.env.NODE_ENV !== "production"

  // The rules themselves live in lib/streak.ts and the write in
  // lib/streakWrite.ts, both shared with /api/v1/streak so the website and the
  // app cannot disagree about a reader's streak.
  const testStreak = (user.streak ?? 0) + 1
  const move: StreakTransition | undefined = test
    ? {
        streak: testStreak,
        freezeCount: (user.freezeCount ?? 0) + (testStreak % FREEZE_EVERY_DAYS === 0 ? 1 : 0),
        lastStreakDate: startOfDay(new Date()),
        advanced: true,
        brokenFrom: null,
        freezeUsed: false,
        freezesSpent: 0,
      }
    : undefined

  const result = await touchStreak(String(user._id), { isPro, move })
  if (!result) {
    return NextResponse.json({ message: "User not found" }, { status: 404 })
  }

  return NextResponse.json(
    {
      streak: result.streak,
      freezes: result.freezes,
      badges: result.badges,
      xp: result.xp,
      brokenFrom: result.brokenFrom,
      freezeUsed: result.freezeUsed,
    },
    { status: 200 }
  )
}
