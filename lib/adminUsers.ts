import mongoose from "mongoose";
import connectMongoDB from "./mongodb";
import User from "../models/User";
import Note from "../models/Note";

import type { AdminPayload } from "./adminStats";

/**
 * The user list behind /admin/users and /api/v1/admin/users.
 *
 * Both callers pass the raw query values; the clamping and the regex escaping
 * live here so neither route can forget them.
 */
export async function adminUsersPayload(params: {
  search?: string | null;
  limit?: string | number | null;
}): Promise<AdminPayload> {
  await connectMongoDB();

  const search = (params.search || "").trim();
  const requestedLimit =
    typeof params.limit === "string" ? parseInt(params.limit, 10) : Number(params.limit ?? 100);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 100, 1),
    500,
  );

  const filter: Record<string, unknown> = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }];
  }

  const users = await User.find(filter)
    .select(
      "name email image isAdmin subscribed storePremium storePremiumPlatform subscriptionStatus " +
        "stripeSubscriptionId " +
        "subscriptionInterval currentPeriodEnd cancelAtPeriodEnd billingIssueSince streak " +
        "createdAt lastStreakDate stripeCustomerId preferences.onboardingCompleted"
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const ids = users.map((u) => u._id);
  const noteCounts = await Note.aggregate<{ _id: unknown; count: number }>([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const noteMap = new Map(noteCounts.map((n) => [String(n._id), n.count]));

  return {
    status: 200,
    body: {
    users: users.map((u) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      image: u.image,
      isAdmin: !!u.isAdmin,
      subscribed: !!u.subscribed,
      // Effective Pro, matching lib/mobilePremium: an App Store subscriber is a
      // paying customer too, and the list showed them as free.
      isPro: !!(u.subscribed || u.storePremium || u.isAdmin),
      storePremium: !!u.storePremium,
      // Pro without anyone paying: the App Store review account, or an admin
      // grant. Shown so it is never mistaken for a subscriber.
      isComped: !!u.subscribed && !u.storePremium && !u.stripeSubscriptionId && !u.subscriptionStatus,
      storePremiumPlatform: u.storePremiumPlatform ?? null,
      subscriptionStatus: u.subscriptionStatus ?? null,
      subscriptionInterval: u.subscriptionInterval ?? null,
      currentPeriodEnd: u.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: !!u.cancelAtPeriodEnd,
      hasBillingIssue: !!u.billingIssueSince,
      // A Stripe customer with no subscription state is a checkout whose result
      // was never written back. Surfaced so it is visible per account.
      needsReconcile: !!u.stripeCustomerId && !u.subscribed && !u.subscriptionStatus,
      streak: u.streak || 0,
      createdAt: u.createdAt,
      lastStreakDate: u.lastStreakDate,
      hasStripe: !!u.stripeCustomerId,
      onboardingCompleted: !!u.preferences?.onboardingCompleted,
      noteCount: noteMap.get(String(u._id)) || 0,
    })),
    },
  };
}

/** The only two flags an admin may flip by hand. Anything else is ignored. */
const ALLOWED_FIELDS = ["isAdmin", "subscribed"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

/**
 * PATCH one account. [callerEmail] is the signed-in admin, used for the two
 * self-harm guards (you cannot demote or delete yourself).
 */
export async function updateAdminUserPayload(
  id: string,
  body: Record<string, unknown>,
  callerEmail: string,
): Promise<AdminPayload> {
  if (!mongoose.isValidObjectId(id)) {
    return { status: 400, body: { error: "Ongeldig ID" } };
  }

  const update: Partial<Record<AllowedField, boolean>> = {};
  for (const key of ALLOWED_FIELDS) {
    if (typeof body[key] === "boolean") update[key] = body[key] as boolean;
  }

  if (Object.keys(update).length === 0) {
    return { status: 400, body: { error: "Geen geldige velden om bij te werken" } };
  }

  await connectMongoDB();

  const target = await User.findById(id).select("email isAdmin subscribed");
  if (!target) return { status: 404, body: { error: "Gebruiker niet gevonden" } };

  if (target.email === callerEmail && update.isAdmin === false) {
    return { status: 400, body: { error: "Je kunt je eigen admin-rechten niet intrekken" } };
  }

  Object.assign(target, update);
  await target.save();

  return {
    status: 200,
    body: {
      user: {
        _id: String(target._id),
        isAdmin: !!target.isAdmin,
        subscribed: !!target.subscribed,
      },
    },
  };
}

/** DELETE one account and its notes. */
export async function deleteAdminUserPayload(
  id: string,
  callerEmail: string,
): Promise<AdminPayload> {
  if (!mongoose.isValidObjectId(id)) {
    return { status: 400, body: { error: "Ongeldig ID" } };
  }

  await connectMongoDB();

  const target = await User.findById(id).select("email");
  if (!target) return { status: 404, body: { error: "Gebruiker niet gevonden" } };

  if (target.email === callerEmail) {
    return { status: 400, body: { error: "Je kunt jezelf niet verwijderen" } };
  }

  await Promise.all([Note.deleteMany({ userId: target._id }), User.deleteOne({ _id: target._id })]);

  return { status: 200, body: { ok: true } };
}
