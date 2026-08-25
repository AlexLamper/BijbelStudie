import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import connectMongoDB from "../../../../../lib/mongodb"
import StudyGroup from "../../../../../models/StudyGroup"
import User from "../../../../../models/User"
import StudyProgress from "../../../../../models/StudyProgress"
import Note from "../../../../../models/Note"

/**
 * Group progress, scored on what a group actually shares.
 *
 * This replaces the plan-progress route. That one could only answer "which day
 * of the reading plan is each member on", so the tab was dead the moment a
 * group had no plan attached - and useless once leesplannen left the website.
 *
 * The group document already carries the two things a group organises itself
 * around: `weeklyAssignment` (one passage, optionally with a due date) and
 * `challenge` (a target number of chapters or notes inside a window). Both are
 * scored here from the members' own study records.
 *
 * Access follows the same rule as the group route: members only, and a group
 * the caller cannot see is a 404 rather than a 403, so this cannot be used to
 * probe which group ids exist.
 */

interface MemberRow {
  id: string
  name: string
  assignmentDone: boolean
  challengeCount: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 })
  }

  await connectMongoDB()

  const caller = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>()
  if (!caller) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 })
  const callerId = String(caller._id)

  const group = await StudyGroup.findById(id)
    .select("members weeklyAssignment challenge")
    .populate("members.userId", "name")
    .lean<{
      members: Array<{ userId: { _id: unknown; name?: string } | null; role: string }>
      weeklyAssignment?: { book?: string; chapter?: number; title?: string; dueDate?: Date | null } | null
      challenge?: { title?: string; type?: "chapters" | "notes"; target?: number; startDate?: Date; endDate?: Date } | null
    }>()

  if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const isMember = group.members.some(m => m.userId && String(m.userId._id) === callerId)
  if (!isMember) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 })

  const memberIds = group.members
    .filter(m => m.userId)
    .map(m => String(m.userId!._id))

  const assignment = group.weeklyAssignment?.book && group.weeklyAssignment?.chapter
    ? group.weeklyAssignment
    : null

  const challenge = group.challenge?.type && group.challenge?.target
    ? group.challenge
    : null

  // Who has studied the assigned passage.
  const assignmentDoneBy = new Set<string>()
  if (assignment) {
    const rows = await StudyProgress.find({
      userId: { $in: memberIds },
      book: assignment.book,
      chapter: assignment.chapter,
    })
      .select("userId")
      .lean<Array<{ userId: unknown }>>()
    for (const row of rows) assignmentDoneBy.add(String(row.userId))
  }

  // Challenge totals inside the window, per member.
  const challengeCounts = new Map<string, number>()
  if (challenge) {
    const start = challenge.startDate ? new Date(challenge.startDate) : new Date(0)
    const end = challenge.endDate ? new Date(challenge.endDate) : new Date()

    if (challenge.type === "notes") {
      const rows = await Note.aggregate([
        { $match: { userId: { $in: memberIds }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ])
      for (const row of rows) challengeCounts.set(String(row._id), row.count)
    } else {
      const rows = await StudyProgress.aggregate([
        { $match: { userId: { $in: memberIds }, completedAt: { $gte: start, $lte: end } } },
        // One chapter studied twice is still one chapter towards the target.
        { $group: { _id: { userId: "$userId", book: "$book", chapter: "$chapter" } } },
        { $group: { _id: "$_id.userId", count: { $sum: 1 } } },
      ])
      for (const row of rows) challengeCounts.set(String(row._id), row.count)
    }
  }

  const members: MemberRow[] = group.members
    .filter(m => m.userId)
    .map(m => {
      const memberId = String(m.userId!._id)
      return {
        id: memberId,
        name: m.userId!.name ?? "Gebruiker",
        assignmentDone: assignmentDoneBy.has(memberId),
        challengeCount: challengeCounts.get(memberId) ?? 0,
      }
    })

  return NextResponse.json({
    assignment: assignment
      ? {
          book: assignment.book,
          chapter: assignment.chapter,
          title: assignment.title ?? null,
          dueDate: assignment.dueDate ?? null,
        }
      : null,
    challenge: challenge
      ? {
          title: challenge.title ?? "",
          type: challenge.type,
          target: challenge.target,
          endDate: challenge.endDate ?? null,
        }
      : null,
    members,
  })
}
