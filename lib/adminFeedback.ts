import mongoose from "mongoose";
import connectMongoDB from "./mongodb";
import Feedback from "../models/Feedback";

/**
 * The read-out behind `/beheer/feedback` and `GET /api/admin/feedback`.
 *
 * Deliberately small: a filterable list, nothing else. No themes UI, no
 * sentiment scoring, no charts. The one thing this must do is make `status`
 * finally mean something, because no UI used to set it.
 */

const STATUSES = ["new", "reviewed", "planned", "shipped", "resolved", "archived"] as const;
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
  "ai_report",
  "study_complete",
  "paywall_dismiss",
  "ai_answer",
  "lesson_quality",
] as const;
const PLATFORMS = ["web", "ios", "android", "onbekend"] as const;
const SENTIMENTS = ["negatief", "neutraal", "positief"] as const;

/** Free-text search is capped before it becomes a regex. */
export const SEARCH_MAX = 80;
export const PAGE_DEFAULT = 50;
export const PAGE_MAX = 200;
const THEME_MAX = 40;
const THEMES_MAX = 10;
const NOTE_MAX = 2000;

export type AdminFeedbackFilters = {
  status?: string | null;
  category?: string | null;
  touchpoint?: string | null;
  limit?: string | number | null;
  platform?: string | null;
  rating?: string | number | null;
  /** "1" = only feedback without a reply yet ("Onbeantwoord"). */
  unanswered?: string | boolean | null;
  /** Free text: message, subject, name, email, note. Escaped and capped. */
  q?: string | null;
  /** Opaque, from the previous page's `nextCursor`. */
  cursor?: string | null;
  /** Deep link: exactly this one document, every other filter ignored. */
  id?: string | null;
};

/** Every regex metacharacter escaped, so a search is always a literal. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `<createdAt ms>_<objectId>`, base64url. Stable under inserts, unlike skip. */
export function encodeCursor(createdAt: Date | string, id: string): string {
  return Buffer.from(`${new Date(createdAt).getTime()}_${id}`).toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): { createdAt: Date; id: mongoose.Types.ObjectId } | null {
  if (!cursor) return null;
  try {
    const [ms, id] = Buffer.from(cursor, "base64url").toString("utf8").split("_");
    const time = Number(ms);
    if (!Number.isFinite(time) || !mongoose.isValidObjectId(id)) return null;
    return { createdAt: new Date(time), id: new mongoose.Types.ObjectId(id) };
  } catch {
    return null;
  }
}

/**
 * The filter for one list request, without the cursor. Pure, so the escaping
 * and the allow-lists are tested without a database. Unknown values are
 * ignored rather than rejected, as they always were here.
 */
export function buildAdminFeedbackQuery(filters: AdminFeedbackFilters): Record<string, unknown> {
  if (filters.id && mongoose.isValidObjectId(filters.id)) {
    return { _id: new mongoose.Types.ObjectId(filters.id) };
  }

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
  if (filters.platform && (PLATFORMS as readonly string[]).includes(filters.platform)) {
    query["context.platform"] = filters.platform === "onbekend" ? null : filters.platform;
  }
  const rating = Number(filters.rating);
  if (filters.rating !== null && filters.rating !== undefined && Number.isInteger(rating) && rating >= 1 && rating <= 5) {
    query.rating = rating;
  }
  if (filters.unanswered === true || filters.unanswered === "1" || filters.unanswered === "true") {
    // Matches a missing field too, which is every document from before replies.
    query.lastReplyAt = null;
  }
  const q = typeof filters.q === "string" ? filters.q.trim().slice(0, SEARCH_MAX) : "";
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    query.$or = ["message", "subject", "name", "email", "contactName", "contactEmail", "adminNote"].map((field) => ({
      [field]: pattern,
    }));
  }
  return query;
}

/**
 * The inbox's counts in ONE aggregation: the filter options' totals over the
 * whole collection plus the filtered total. Replaces three full `$group`
 * scans and a `countDocuments` - Active CPU on Vercel is a standing budget.
 */
export function adminFeedbackCountsPipeline(match: Record<string, unknown>): Record<string, unknown>[] {
  return [
    {
      $facet: {
        status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        category: [{ $group: { _id: "$category", count: { $sum: 1 } } }],
        touchpoint: [{ $group: { _id: "$touchpoint", count: { $sum: 1 } } }],
        platform: [{ $group: { _id: "$context.platform", count: { $sum: 1 } } }],
        unanswered: [{ $match: { lastReplyAt: null } }, { $count: "n" }],
        total: [{ $match: match }, { $count: "n" }],
      },
    },
  ];
}

/** `{ newCount }` for the /beheer dashboard card. One indexed count. */
export async function adminFeedbackSummary(): Promise<{ newCount: number }> {
  await connectMongoDB();
  const newCount = await Feedback.countDocuments({ status: "new" });
  return { newCount };
}

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
          subject: string;
          message: string;
          page: string;
          status: string;
          touchpoint: string;
          answers: { key: string; value: string }[];
          context: Record<string, unknown> | null;
          aiReport: {
            reason: string;
            comment: string;
            question: string;
            answer: string;
            surface: string;
            model: string | null;
          } | null;
          createdAt: string;
          segment: string | null;
          adminNote: string;
          themes: string[];
          sentiment: string | null;
          replies: { at: string; body: string; channel: string; emailStatus: string | null }[];
          lastReplyAt: string | null;
        }>;
        total: number;
        nextCursor: string | null;
        counts: {
          status: Record<string, number>;
          category: Record<string, number>;
          touchpoint: Record<string, number>;
          platform: Record<string, number>;
          unanswered: number;
        };
      };
};

export async function adminFeedbackPayload(filters: AdminFeedbackFilters): Promise<AdminFeedbackPayload> {
  await connectMongoDB();

  const query = buildAdminFeedbackQuery(filters);

  const requestedLimit =
    typeof filters.limit === "string" ? parseInt(filters.limit, 10) : Number(filters.limit ?? PAGE_DEFAULT);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : PAGE_DEFAULT, 1),
    PAGE_MAX,
  );

  // Keyset pagination on (createdAt, _id), newest first.
  const cursor = filters.id ? null : decodeCursor(filters.cursor);
  const pageQuery = cursor
    ? {
        $and: [
          query,
          {
            $or: [
              { createdAt: { $lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
            ],
          },
        ],
      }
    : query;

  type CountRow = { _id: string | null; count: number };
  type Facets = {
    status: CountRow[];
    category: CountRow[];
    touchpoint: CountRow[];
    platform: CountRow[];
    unanswered: { n: number }[];
    total: { n: number }[];
  };
  const [docs, facets] = await Promise.all([
    Feedback.find(pageQuery).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean(),
    Feedback.aggregate<Facets>(adminFeedbackCountsPipeline(query) as never[]),
  ]);

  const toCountMap = (rows: CountRow[] = []) =>
    Object.fromEntries(rows.map((r) => [r._id ?? "onbekend", r.count]));
  const facet: Facets | undefined = facets[0];
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;
  const lastDoc = pageDocs[pageDocs.length - 1];
  const nextCursor = hasMore && lastDoc?.createdAt ? encodeCursor(lastDoc.createdAt, String(lastDoc._id)) : null;

  return {
    status: 200,
    body: {
      feedback: pageDocs.map((d) => ({
        _id: String(d._id),
        userId: d.userId ? String(d.userId) : null,
        name: d.name || "",
        email: d.email || "",
        contactName: d.contactName || "",
        contactEmail: d.contactEmail || "",
        category: d.category || "other",
        rating: typeof d.rating === "number" ? d.rating : null,
        subject: d.subject || "",
        message: d.message || "",
        page: d.page || "",
        status: d.status || "new",
        touchpoint: d.touchpoint || "unprompted",
        answers: Array.isArray(d.answers)
          ? d.answers.map((a: { key?: string; value?: string }) => ({ key: a.key || "", value: a.value || "" }))
          : [],
        context: d.context ?? null,
        aiReport: d.aiReport
          ? {
              reason: d.aiReport.reason || "anders",
              comment: d.aiReport.comment || "",
              question: d.aiReport.question || "",
              answer: d.aiReport.answer || "",
              surface: d.aiReport.surface || "onbekend",
              model: d.aiReport.model ?? null,
            }
          : null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
        segment: d.segment ?? null,
        adminNote: d.adminNote || "",
        themes: Array.isArray(d.themes) ? d.themes : [],
        sentiment: d.sentiment ?? null,
        replies: Array.isArray(d.replies)
          ? d.replies.map((r: { at?: Date; body?: string; channel?: string; emailStatus?: string | null }) => ({
              at: r.at ? new Date(r.at).toISOString() : "",
              body: r.body || "",
              channel: r.channel || "in_app",
              emailStatus: r.emailStatus ?? null,
            }))
          : [],
        lastReplyAt: d.lastReplyAt ? new Date(d.lastReplyAt).toISOString() : null,
      })),
      total: facet?.total?.[0]?.n ?? 0,
      nextCursor,
      counts: {
        status: toCountMap(facet?.status),
        category: toCountMap(facet?.category),
        touchpoint: toCountMap(facet?.touchpoint),
        platform: toCountMap(facet?.platform),
        unanswered: facet?.unanswered?.[0]?.n ?? 0,
      },
    },
  };
}

/**
 * View 2 of the read-out: the prompted answers,
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

/**
 * Triage edits from the inbox: status, the internal note, themes and
 * sentiment. Every field is validated on its own and written with one `$set`
 * of only the fields that were sent.
 */
export function buildTriageUpdate(body: Record<string, unknown>):
  | { ok: true; set: Record<string, unknown> }
  | { ok: false; error: string } {
  const set: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !(STATUSES as readonly string[]).includes(body.status)) {
      return { ok: false, error: "Ongeldige status" };
    }
    set.status = body.status;
  }
  if (body.adminNote !== undefined) {
    if (typeof body.adminNote !== "string") return { ok: false, error: "Ongeldige notitie" };
    set.adminNote = body.adminNote.slice(0, NOTE_MAX);
  }
  if (body.themes !== undefined) {
    if (!Array.isArray(body.themes)) return { ok: false, error: "Ongeldige thema's" };
    set.themes = [
      ...new Set(
        body.themes
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().toLowerCase().slice(0, THEME_MAX))
          .filter(Boolean),
      ),
    ].slice(0, THEMES_MAX);
  }
  if (body.sentiment !== undefined) {
    if (body.sentiment !== null && !(SENTIMENTS as readonly unknown[]).includes(body.sentiment)) {
      return { ok: false, error: "Ongeldig sentiment" };
    }
    set.sentiment = body.sentiment;
  }
  if (Object.keys(set).length === 0) return { ok: false, error: "Niets om bij te werken" };
  return { ok: true, set };
}

export async function adminFeedbackUpdate(
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: { ok: true } | { error: string } }> {
  if (!mongoose.isValidObjectId(id)) return { status: 404, body: { error: "Niet gevonden" } };
  const built = buildTriageUpdate(body);
  if (built.ok === false) return { status: 400, body: { error: built.error } };
  await connectMongoDB();
  const result = await Feedback.updateOne({ _id: id }, { $set: built.set });
  if (!result.matchedCount) return { status: 404, body: { error: "Niet gevonden" } };
  return { status: 200, body: { ok: true } };
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
