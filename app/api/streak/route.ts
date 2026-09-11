import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { grantXp } from "../../../lib/gamification"
import { advanceStreak, startOfDay } from "../../../lib/streak"

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
  return NextResponse.json({ streak: user.streak, freezes: user.freezeCount }, { status: 200 })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  await connectMongoDB()
  const user = await User.findOne({ email: session.user.email })
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 })
  }

  // `?test=true` skips every rule and just increments. It is a development
  // aid, but as a production route it let any signed-in user inflate their own
  // streak - and now their badges and XP with it - from the browser console.
  const url = new URL(request.url)
  const test = url.searchParams.get("test") === "true" && process.env.NODE_ENV !== "production"

  // The rules themselves live in lib/streak.ts, shared with /api/v1/streak so
  // the website and the app cannot disagree about a reader's streak.
  const testStreak = (user.streak ?? 0) + 1
  const move = test
    ? {
        streak: testStreak,
        freezeCount: (user.freezeCount ?? 0) + (testStreak % 5 === 0 ? 1 : 0),
        lastStreakDate: startOfDay(new Date()),
        advanced: true,
        brokenFrom: null as number | null,
        freezeUsed: false,
      }
    : advanceStreak(
        {
          streak: user.streak,
          freezeCount: user.freezeCount,
          lastStreakDate: user.lastStreakDate,
        },
        { isPro: Boolean(user.subscribed) },
      )

  const newBadges = [...(user.badges ?? [])]

  const set: Record<string, unknown> = {
    streak: move.streak,
    freezeCount: move.freezeCount,
    lastStreakDate: move.lastStreakDate,
  }
  // What the reader lost, kept for the return-visit prompt on the dashboard.
  if (move.brokenFrom !== null) {
    set.lostStreak = move.brokenFrom
    set.lostStreakAt = startOfDay(new Date())
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $set: set,
      // The record the streak-gated Levensboom items read: it only ever grows.
      $max: { longestStreak: move.streak },
    },
    { new: true }
  )

  // Badges are no longer awarded here. `lib/gamification.ts` evaluates the
  // whole set at once, which also fixes the old `else if` chain that could
  // only ever grant one badge per call - a user crossing two thresholds
  // together silently lost the lower one.
  const xp = move.advanced
    ? await grantXp(String(user._id), "streak_day", { isPro: Boolean(user.subscribed) })
    : null

  return NextResponse.json(
    {
      streak: updated.streak,
      freezes: updated.freezeCount,
      badges: xp ? [...new Set([...newBadges, ...xp.newBadges])] : newBadges,
      xp,
      brokenFrom: move.brokenFrom,
      freezeUsed: move.freezeUsed,
    },
    { status: 200 }
  )
}