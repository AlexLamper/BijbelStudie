import { NextResponse } from "next/server";
import connectMongoDB from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Note from "../../../../models/Note";
import ReadingSession from "../../../../models/ReadingSession";
import AnalyticsEvent from "../../../../models/AnalyticsEvent";
import StudyEnrollment from "../../../../models/StudyEnrollment.js";
import StudyProgress from "../../../../models/StudyProgress.js";
import StudyLessonState from "../../../../models/StudyLessonState.js";
import { requireAdmin } from "../../../../lib/adminGuard";
import { ROUTE_LABELS, type RouteKey } from "../../../../lib/analyticsRoutes";
import { curatedStudies } from "../../../../lib/data/curated-studies";

/**
 * Everything /admin/insights renders.
 *
 * Three groups, because they answer different questions and come from different
 * places:
 *
 *   growth     - daily series from the domain collections (User, Note,
 *                ReadingSession). Buckets on the field that records when the
 *                thing actually happened, never on `updatedAt`, which moves
 *                every time anything about the document changes and turns a
 *                conversion chart into an activity chart.
 *   engagement - the study funnel, from StudyEnrollment / StudyProgress /
 *                StudyLessonState. "How many people study" is a real question
 *                with a real answer and it was not on this page at all.
 *   behaviour  - page views and clicks from AnalyticsEvent. Only route keys and
 *                registered click targets are ever stored (see
 *                lib/analyticsRoutes.ts), so these aggregations are over a
 *                closed set and cannot leak anything a visitor typed.
 *
 * Every count here is an aggregate over all users. Nothing in the response
 * identifies a person - no emails, no ids, no per-user rows.
 */

export const dynamic = "force-dynamic";

interface BucketDoc {
  _id: string;
  count: number;
}

function emptyDays(days: number): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

function mergeBuckets(
  base: { date: string; count: number }[],
  buckets: BucketDoc[]
): { date: string; count: number }[] {
  const map = new Map(buckets.map((b) => [b._id, b.count]));
  return base.map((row) => ({ ...row, count: map.get(row.date) ?? 0 }));
}

const STUDY_TITLES = new Map(curatedStudies.map((s) => [s.id, s.title]));

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectMongoDB();

  const url = new URL(req.url);
  const range = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 7), 365);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (range - 1));

  const bucketOn = (field: string) => ({
    $dateToString: { format: "%Y-%m-%d", date: `$${field}` },
  });

  const [
    signupBuckets,
    noteBuckets,
    sessionBuckets,
    subscriberBuckets,
    cancellationBuckets,
    pageViewBuckets,
    // Behaviour
    topPages,
    topClicks,
    uniqueVisitors,
    loggedInSplit,
    // Study funnel
    enrollmentTotals,
    enrollmentsByStudy,
    lessonsByStudy,
    lessonBuckets,
    quizStats,
    reflectionCount,
    activeStudents,
  ] = await Promise.all([
    User.aggregate<BucketDoc>([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
    ]),
    Note.aggregate<BucketDoc>([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
    ]),
    ReadingSession.aggregate<BucketDoc>([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: bucketOn("createdAt"), count: { $sum: 1 } } },
    ]),
    // Every account that started a subscription in the window, whatever its
    // status is now. A subscription that started and was cancelled inside the
    // range still happened, and hiding it makes conversion look worse than it was.
    User.aggregate<BucketDoc>([
      { $match: { subscriptionStartedAt: { $gte: startDate, $ne: null } } },
      { $group: { _id: bucketOn("subscriptionStartedAt"), count: { $sum: 1 } } },
    ]),
    User.aggregate<BucketDoc>([
      {
        $match: {
          subscriptionStatus: { $in: ["canceled", "unpaid"] },
          updatedAt: { $gte: startDate },
        },
      },
      { $group: { _id: bucketOn("updatedAt"), count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate<BucketDoc>([
      { $match: { name: "page_view", occurredAt: { $gte: startDate } } },
      { $group: { _id: bucketOn("occurredAt"), count: { $sum: 1 } } },
    ]),

    AnalyticsEvent.aggregate<{ _id: string; count: number; visitors: number }>([
      { $match: { name: "page_view", occurredAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$props.path",
          count: { $sum: 1 },
          // A view is not a visitor. Both numbers are needed to tell a page
          // people return to from one someone reloaded twenty times.
          visitorSet: { $addToSet: { $ifNull: ["$userId", "$anonId"] } },
        },
      },
      { $project: { count: 1, visitors: { $size: "$visitorSet" } } },
      { $sort: { count: -1 } },
      { $limit: 25 },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          name: "ui_click",
          occurredAt: { $gte: startDate },
          // A target that failed the allowlist is stripped by sanitizeProps and
          // leaves the event with no target at all. Counting those would put an
          // "onbekend" row at the top of the chart that no one can act on.
          "props.target": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$props.target", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]),
    AnalyticsEvent.aggregate<{ _id: null; total: number }>([
      { $match: { name: "page_view", occurredAt: { $gte: startDate } } },
      { $group: { _id: { $ifNull: ["$userId", "$anonId"] } } },
      { $count: "total" },
    ]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([
      { $match: { name: "page_view", occurredAt: { $gte: startDate } } },
      { $group: { _id: { $ifNull: ["$props.logged_in", "no"] }, count: { $sum: 1 } } },
    ]),

    StudyEnrollment.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    StudyEnrollment.aggregate<{ _id: string; count: number; completed: number }>([
      {
        $group: {
          _id: "$studyId",
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $ifNull: ["$completedAt", false] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    StudyProgress.aggregate<{ _id: string; count: number }>([
      { $match: { studyId: { $ne: null } } },
      { $group: { _id: "$studyId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    StudyProgress.aggregate<BucketDoc>([
      { $match: { completedAt: { $gte: startDate } } },
      { $group: { _id: bucketOn("completedAt"), count: { $sum: 1 } } },
    ]),
    StudyLessonState.aggregate<{
      _id: null;
      attempts: number;
      graded: number;
      score: number;
      total: number;
    }>([
      { $match: { "quiz.total": { $gt: 0 } } },
      {
        $group: {
          _id: null,
          attempts: { $sum: { $ifNull: ["$quiz.attempts", 0] } },
          graded: { $sum: 1 },
          score: { $sum: "$quiz.score" },
          total: { $sum: "$quiz.total" },
        },
      },
    ]),
    StudyLessonState.countDocuments({ "reflection.text": { $exists: true, $ne: "" } }),
    // Someone who touched a lesson inside the window. The honest answer to
    // "how many people study".
    StudyLessonState.distinct("userId", { updatedAt: { $gte: startDate } }),
  ]);

  const base = emptyDays(range);

  const enrollmentStatus: Record<string, number> = {};
  for (const row of enrollmentTotals) enrollmentStatus[row._id ?? "unknown"] = row.count;

  const lessonsDoneByStudy = new Map(lessonsByStudy.map((r) => [r._id, r.count]));
  const quiz = quizStats[0];
  const views = loggedInSplit.reduce(
    (acc, row) => {
      if (row._id === "yes") acc.loggedIn = row.count;
      else acc.loggedOut = row.count;
      return acc;
    },
    { loggedIn: 0, loggedOut: 0 }
  );

  return NextResponse.json({
    range,

    // --- Growth ---------------------------------------------------------
    signups: mergeBuckets(base, signupBuckets),
    notes: mergeBuckets(base, noteBuckets),
    readingSessions: mergeBuckets(base, sessionBuckets),
    newSubscribers: mergeBuckets(base, subscriberBuckets),
    cancellations: mergeBuckets(base, cancellationBuckets),
    pageViews: mergeBuckets(base, pageViewBuckets),
    lessonsCompleted: mergeBuckets(base, lessonBuckets),

    // --- Behaviour ------------------------------------------------------
    traffic: {
      uniqueVisitors: uniqueVisitors[0]?.total ?? 0,
      loggedInViews: views.loggedIn,
      loggedOutViews: views.loggedOut,
    },
    topPages: topPages.map((row) => ({
      key: row._id,
      label: ROUTE_LABELS[row._id as RouteKey] ?? row._id ?? "Onbekend",
      views: row.count,
      visitors: row.visitors,
    })),
    topClicks: topClicks.map((row) => ({ target: row._id ?? "onbekend", count: row.count })),

    // --- Study engagement -----------------------------------------------
    study: {
      enrollmentsActive: enrollmentStatus.active ?? 0,
      enrollmentsCompleted: enrollmentStatus.completed ?? 0,
      enrollmentsTotal: enrollmentTotals.reduce((sum, row) => sum + row.count, 0),
      activeStudents: Array.isArray(activeStudents) ? activeStudents.length : 0,
      reflectionsWritten: reflectionCount,
      quizAttempts: quiz?.attempts ?? 0,
      quizzesGraded: quiz?.graded ?? 0,
      quizAccuracy: quiz && quiz.total > 0 ? Math.round((quiz.score / quiz.total) * 100) : null,
      perStudy: enrollmentsByStudy.map((row) => ({
        studyId: row._id,
        title: STUDY_TITLES.get(row._id) ?? row._id,
        enrollments: row.count,
        completed: row.completed,
        lessonsCompleted: lessonsDoneByStudy.get(row._id) ?? 0,
      })),
    },
  });
}
