import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"

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

  const url = new URL(request.url)
  const test = url.searchParams.get("test") === "true"

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

  if (newStreak >= 90 && !newBadges.includes("streak90")) {
    newBadges.push("streak90")
  } else if (newStreak >= 60 && !newBadges.includes("streak60")) {
    newBadges.push("streak60")
  } else if (newStreak >= 30 && !newBadges.includes("streak30")) {
    newBadges.push("streak30")
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    {
      streak: newStreak,
      freezeCount: newFreezes,
      lastStreakDate: newDate,
      badges: newBadges,
    },
    { new: true }
  )

  return NextResponse.json(
    { streak: updated.streak, freezes: updated.freezeCount },
    { status: 200 }
  )
}