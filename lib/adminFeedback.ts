import connectMongoDB from "./mongodb";
import Feedback from "../models/Feedback";

/**
 * The read-out behind `/admin/feedback` and `GET /api/admin/feedback`.
 *
 * Phase 1 of FEEDBACK_PLAN.md scopes this deliberately small: a filterable
 * list, nothing else. No themes UI, no sentiment scoring, no charts - those
 * are later phases. The one thing this must do is make `status` finally
 * mean something, because today no UI ever sets it (see the plan's section
 * 1.1: "the `status` enum has never been set by any UI").
 */

const STATUSES = ["new", "reviewed", "resolved", "archived"] as const;
const CATEGORIES = ["bug", "feature", "praise", "other"] as const;
const TOUCHPOINTS = [
  "unprompted",
  "study_lesson_complete",
  "quiz_question_review",
  "quiz_complete",
  "study_abandoned",
  "onboarding_abandoned",
  "subscription_cancel",
  "dormant_return",
  "pmf_survey",
] as const;

export type AdminFeedbackFilters = {
  status?: string | null;
  category?: string | null;
  touchpoint?: string | null;
  limit?: string | number | null;
};

export type AdminFeedbackPayload = {
  status: number;
  body:
    | { error: string }
    | {
        feedback: Array<{
          _id: string;
          userId: string | null;
          name: string;
          email: string;
          contactName: string;
          contactEmail: string;
          category: string;
          rating: number | null;
          message: string;
          page: string;
          status: string;
          touchpoint: string;
          answers: { key: string; value: string }[];
          context: Record<string, unknown> | null;
          createdAt: string;
        }>;
        total: number;
        counts: { status: Record<string, number>; category: Record<string, number>; touchpoint: Record<string, number> };
      };
};

export async function adminFeedbackPayload(filters: AdminFeedbackFilters): Promise<AdminFeedbackPayload> {
  await connectMongoDB();

  const query: Record<string, unknown> = {};
  if (filters.status && (STATUSES as readonly string[]).includes(filters.status)) {
    query.status = filters.status;
  }
  if (filters.category && (CATEGORIES as readonly string[]).includes(filters.category)) {
    query.category = filters.category;
  }
  if (filters.touchpoint && (TOUCHPOINTS as readonly string[]).includes(filters.touchpoint)) {
    query.touchpoint = filters.touchpoint;
  }

  const requestedLimit =
    typeof filters.limit === "string" ? parseInt(filters.limit, 10) : Number(filters.limit ?? 100);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 100, 1), 500);

  const [docs, total, statusCounts, categoryCounts, touchpointCounts] = await Promise.all([
    Feedback.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Feedback.countDocuments(query),
    Feedback.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Feedback.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Feedback.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$touchpoint", count: { $sum: 1 } } }]),
  ]);

  const toCountMap = (rows: { _id: string; count: number }[]) =>
    Object.fromEntries(rows.map((r) => [r._id ?? "onbekend", r.count]));

  return {
    status: 200,
    body: {
      feedback: docs.map((d) => ({
        _id: String(d._id),
        userId: d.userId ? String(d.userId) : null,
        name: d.name || "",
        email: d.email || "",
        contactName: d.contactName || "",
        contactEmail: d.contactEmail || "",
        category: d.category || "other",
        rating: typeof d.rating === "number" ? d.rating : null,
        message: d.message || "",
        page: d.page || "",
        status: d.status || "new",
        touchpoint: d.touchpoint || "unprompted",
        answers: Array.isArray(d.answers)
          ? d.answers.map((a: { key?: string; value?: string }) => ({ key: a.key || "", value: a.value || "" }))
          : [],
        context: d.context ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
      })),
      total,
      counts: {
        status: toCountMap(statusCounts),
        category: toCountMap(categoryCounts),
        touchpoint: toCountMap(touchpointCounts),
      },
    },
  };
}

/**
 * View 2 of the read-out (FEEDBACK_PLAN.md section 4.7): the prompted answers,
 * rolled up per study and lesson.
 *
 * The list view answers "what did people say"; this answers "where". A lesson
 * with four "minst duidelijk" answers is a lesson to rewrite, and a lesson with
 * a run of "nee" on the quiz-match question has the wrong quiz slugs in
 * lib/data/study-lessons - which is a five-minute fix that is invisible in a
 * flat list.
 *
 * One aggregation, grouped in Mongo rather than in Node: the collection is
 * small today but this is the query that grows with every answer, and Active
 * CPU on Vercel is a standing constraint.
 */
export type AdminFeedbackByLesson = {
  status: number;
  body:
    | { error: string }
    | {
        rows: {
          studyId: string;
          lessonDay: number | null;
          total: number;
          /** Answer counts per prompt, e.g. { t2b_quiz_match: 3 }. */
          prompts: Record<string, number>;
          /** For a choice question, how the options fell, e.g. { nee: 2 }. */
          choices: Record<string, number>;
          lastAt: string;
        }[];
      };
};

export async function adminFeedbackByLesson(limit?: string | null): Promise<AdminFeedbackByLesson> {
  const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);
  await connectMongoDB();

  const rows = await Feedback.aggregate<{
    _id: { studyId: string | null; lessonDay: number | null };
    total: number;
    prompts: string[];
    choices: string[];
    lastAt: Date;
  }>([
    { $match: { touchpoint: { $ne: "unprompted" }, "context.studyId": { $ne: null } } },
    {
      $group: {
        _id: { studyId: "$context.studyId", lessonDay: "$context.lessonDay" },
        total: { $sum: 1 },
        prompts: { $push: "$promptId" },
        // Only the chosen option, never the free text: this rollup is counts,
        // and the words themselves are read one at a time in the list view.
        choices: {
          $push: {
            $let: {
              vars: {
                keuze: {
                  $first: {
                    $filter: { input: { $ifNull: ["$answers", []] }, cond: { $eq: ["$$this.key", "keuze"] } },
                  },
                },
              },
              in: "$$keuze.value",
            },
          },
        },
        lastAt: { $max: "$createdAt" },
      },
    },
    { $sort: { total: -1, lastAt: -1 } },
    { $limit: cap },
  ]);

  const tally = (values: (string | null | undefined)[]) => {
    const out: Record<string, number> = {};
    for (const value of values) {
      if (!value) continue;
      out[value] = (out[value] ?? 0) + 1;
    }
    return out;
  };

  return {
    status: 200,
    body: {
      rows: rows.map((row) => ({
        studyId: row._id.studyId ?? "onbekend",
        lessonDay: row._id.lessonDay ?? null,
        total: row.total,
        prompts: tally(row.prompts),
        choices: tally(row.choices),
        lastAt: row.lastAt ? new Date(row.lastAt).toISOString() : "",
      })),
    },
  };
}

export async function adminFeedbackUpdateStatus(id: string, status: string): Promise<{ status: number; body: { ok: true } | { error: string } }> {
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { status: 400, body: { error: "Ongeldige status" } };
  }
  await connectMongoDB();
  const doc = await Feedback.findByIdAndUpdate(id, { $set: { status } }, { new: true }).select("_id");
  if (!doc) {
    return { status: 404, body: { error: "Niet gevonden" } };
  }
  return { status: 200, body: { ok: true } };
}
