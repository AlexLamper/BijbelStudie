import mongoose from "mongoose";
import connectMongoDB from "./mongodb";
import User from "../models/User";
import Note from "../models/Note";

import type { AdminPayload } from "./adminStats";
import { proRingGrant } from "./levensboom/proRing";
import { isProtectedAccount } from "./accountArchive";
import { archiveAndDeleteAccount } from "./accountDeletion";
import { normaliseEmail } from "./userLookup";
import { MAX_COMP_MONTHS, compedProExpiry } from "./compedPro";

/**
 * The user list behind /beheer/gebruikers and /api/v1/admin/users.
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
      "name email image isAdmin subscribed compedProUntil storePremium storePremiumPlatform subscriptionStatus " +
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
      // Set only on a time-limited grant; lib/compedPro.ts ends it on this date.
      compedProUntil: u.compedProUntil ?? null,
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

  // A time-limited Pro grant. It is `subscribed: true` like the manual toggle,
  // plus the end date the daily sweep in lib/compedPro.ts acts on.
  let compedProUntil: Date | null | undefined;
  if (body.compMonths !== undefined) {
    const months = Number(body.compMonths);
    if (!Number.isInteger(months) || months < 1 || months > MAX_COMP_MONTHS) {
      return { status: 400, body: { error: "Ongeldige periode" } };
    }
    update.subscribed = true;
    compedProUntil = compedProExpiry(months);
  } else if (update.subscribed !== undefined) {
    // Both plain toggles end the grant: switching Pro off revokes it, switching
    // it on by hand is the open-ended grant it has always been.
    compedProUntil = null;
  }

  if (Object.keys(update).length === 0) {
    return { status: 400, body: { error: "Geen geldige velden om bij te werken" } };
  }

  await connectMongoDB();

  const target = await User.findById(id).select("email isAdmin subscribed compedProUntil storePremium");
  if (!target) return { status: 404, body: { error: "Gebruiker niet gevonden" } };

  if (target.email === callerEmail && update.isAdmin === false) {
    return { status: 400, body: { error: "Je kunt je eigen admin-rechten niet intrekken" } };
  }

  // Taken before the grant lands: only the transition to Pro equips the gold
  // ring, never a re-grant of an account that already is Pro.
  const before = {
    subscribed: !!target.subscribed,
    isAdmin: !!target.isAdmin,
    storePremium: !!target.storePremium,
  };

  Object.assign(target, update);
  await target.save();

  // Explicit-path writes, apart from the save(): `levensboom` is not in the
  // selection above, and this must not be able to touch the rest of the choice.
  const set: Record<string, unknown> = {};
  const ring = proRingGrant(before, { ...before, ...update });
  if (ring) Object.assign(set, ring);
  if (compedProUntil !== undefined) set.compedProUntil = compedProUntil;
  if (Object.keys(set).length > 0) await User.updateOne({ _id: target._id }, { $set: set });

  return {
    status: 200,
    body: {
      user: {
        _id: String(target._id),
        isAdmin: !!target.isAdmin,
        subscribed: !!target.subscribed,
        compedProUntil: compedProUntil !== undefined ? compedProUntil : (target.compedProUntil ?? null),
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

  const target = await User.findById(id).select("email isAdmin");
  if (!target) return { status: 404, body: { error: "Gebruiker niet gevonden" } };

  // Case-insensitive: the session email and the stored one can differ in case.
  if (normaliseEmail(String(target.email ?? "")) === normaliseEmail(callerEmail)) {
    return { status: 400, body: { error: "Je kunt jezelf niet verwijderen" } };
  }

  // An admin account never goes through here. Take the admin role away first
  // if you really mean it; lib/accountArchive.ts describes the 2026-09-08 loss
  // this guard exists for.
  if (isProtectedAccount(target)) {
    return {
      status: 403,
      body: { error: "Beheerdersaccounts kun je niet via het beheer verwijderen. Haal eerst de beheerdersrol weg." },
    };
  }

  // Copy first, then the same removal as the self-service deletes - all inside
  // lib/accountDeletion.ts. A failed copy aborts the delete (surfaces as a 500).
  const archive = await archiveAndDeleteAccount(
    { _id: target._id, email: target.email, isAdmin: target.isAdmin },
    { route: "admin", actor: callerEmail },
  );

  return { status: 200, body: { ok: true, archiveId: archive.archiveId } };
}
