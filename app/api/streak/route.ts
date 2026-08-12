import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"
import { grantXp } from "../../../lib/gamification"

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  return d
}

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
  // streak — and now their badges and XP with it — from the browser console.
  const url = new URL(request.url)
  const test = url.searchParams.get("test") === "true" && process.env.NODE_ENV !== "production"

  const today = startOfDay(new Date())
  const last = user.lastStreakDate ? startOfDay(user.lastStreakDate) : null
  let newStreak = user.streak
  let newFreezes = user.freezeCount
  let newDate = user.lastStreakDate
  const newBadges = [...user.badges]

  if (test) {
    newStreak += 1
    newDate = today
  } else if (!last || today.getTime() !== last.getTime()) {
    if (last && (today.getTime() - last.getTime()) / 86400000 === 1) {
      newStreak += 1
    } else if (last && (today.getTime() - last.getTime()) / 86400000 > 1) {
      if (newFreezes > 0 && user.subscribed) {
        newFreezes -= 1
      } else {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    if (newStreak % 5 === 0) {
      newFreezes += 1
    }

    newDate = today
  }

  if (newStreak % 5 === 0 && test) {
    newFreezes += 1
  }

  const advanced = String(newDate) !== String(user.lastStreakDate)

  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    {
      streak: newStreak,
      freezeCount: newFreezes,
      lastStreakDate: newDate,
    },
    { new: true }
  )

  // Badges are no longer awarded here. `lib/gamification.ts` evaluates the
  // whole set at once, which also fixes the old `else if` chain that could
  // only ever grant one badge per call — a user crossing two thresholds
  // together silently lost the lower one.
  const xp = advanced
    ? await grantXp(String(user._id), "streak_day", { isPro: Boolean(user.subscribed) })
    : null

  return NextResponse.json(
    {
      streak: updated.streak,
      freezes: updated.freezeCount,
      badges: xp ? [...new Set([...newBadges, ...xp.newBadges])] : newBadges,
      xp,
    },
    { status: 200 }
  )
}