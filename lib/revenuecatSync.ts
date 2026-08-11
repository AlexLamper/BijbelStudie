import mongoose from 'mongoose';
import User from '../models/User';

/**
 * RevenueCat -> MongoDB entitlement sync.
 *
 * The contract that makes this work at all: RevenueCat's `app_user_id` IS the
 * Mongo `User._id`. The app calls `Purchases.logIn(user.id)` right after login
 * for exactly that reason. If the two ever drift, every purchase validates at
 * Apple, succeeds in the app, and silently fails to unlock anything on the
 * server.
 */

export const PRO_ENTITLEMENT_ID = process.env.REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pro';

type SubscriberEntitlement = {
  expires_date?: string | null;
  expires_date_ms?: number | null;
  store?: string | null;
};

type SubscriberResponse = {
  subscriber?: {
    entitlements?: { active?: Record<string, SubscriberEntitlement | undefined> };
  };
};

export type StorePremiumPatch = {
  storePremium: boolean;
  storePremiumPlatform: 'apple' | 'google' | null;
  storePremiumExpiresAt: Date | null;
};

function parseExpires(ent: SubscriberEntitlement | undefined): Date | null {
  if (!ent) return null;
  if (ent.expires_date) {
    const d = new Date(ent.expires_date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ent.expires_date_ms === 'number') return new Date(ent.expires_date_ms);
  return null;
}

function storeToPlatform(store: string | null | undefined): 'apple' | 'google' | null {
  if (!store) return null;
  const s = store.toLowerCase();
  if (s.includes('app_store') || s.includes('mac_app_store')) return 'apple';
  if (s.includes('play_store')) return 'google';
  return null;
}

/** Authoritative read: RevenueCat's live subscriber object. */
export async function fetchStorePremiumFromRevenueCat(
  appUserId: string,
): Promise<StorePremiumPatch> {
  const apiKey = process.env.REVENUECAT_REST_API_KEY;
  if (!apiKey) throw new Error('REVENUECAT_REST_API_KEY is not set');

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RevenueCat API ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as SubscriberResponse;
  const ent = data.subscriber?.entitlements?.active?.[PRO_ENTITLEMENT_ID];

  return {
    storePremium: Boolean(ent),
    storePremiumPlatform: ent ? storeToPlatform(ent.store) : null,
    storePremiumExpiresAt: ent ? parseExpires(ent) : null,
  };
}

export type RevenueCatWebhookEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  store?: string | null;
};

/**
 * Fallback for when no REST key is configured (local dev). Conservative:
 * grants only on an unambiguous purchase signal, revokes on EXPIRATION, and
 * returns null ("no opinion") for everything else rather than guessing.
 */
export function inferStorePremiumFromEvent(
  event: RevenueCatWebhookEvent,
): StorePremiumPatch | null {
  const type = event.type;
  const hasPro = (event.entitlement_ids ?? []).includes(PRO_ENTITLEMENT_ID);

  if (type === 'TEST') return null;
  if (type === 'EXPIRATION') {
    return { storePremium: false, storePremiumPlatform: null, storePremiumExpiresAt: null };
  }

  const grantTypes = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'NON_RENEWING_PURCHASE',
    'UNCANCELLATION',
    'PRODUCT_CHANGE',
    'TEMPORARY_ENTITLEMENT_GRANT',
  ]);

  if (type && grantTypes.has(type) && hasPro) {
    const ms = event.expiration_at_ms;
    return {
      storePremium: true,
      storePremiumPlatform: storeToPlatform(event.store) ?? 'apple',
      storePremiumExpiresAt: typeof ms === 'number' && ms > 0 ? new Date(ms) : null,
    };
  }

  return null;
}

export async function applyStorePremium(
  appUserId: string,
  patch: StorePremiumPatch,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(appUserId)) {
    // Not a Mongo _id: the app is logging into RevenueCat with the wrong id.
    throw new Error(`Invalid app_user_id (expected a Mongo ObjectId): ${appUserId}`);
  }

  const result = await User.updateOne(
    { _id: new mongoose.Types.ObjectId(appUserId) },
    {
      $set: {
        storePremium: patch.storePremium,
        storePremiumPlatform: patch.storePremiumPlatform,
        storePremiumExpiresAt: patch.storePremiumExpiresAt,
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new Error(`User not found for app_user_id: ${appUserId}`);
  }
  // NOTE: `subscribed` (Stripe) is deliberately left alone. Effective Pro is
  // the OR of the two — see lib/mobilePremium.ts.
}

export async function syncStorePremiumForAppUser(
  appUserId: string,
  webhookEvent?: RevenueCatWebhookEvent,
): Promise<void> {
  if (process.env.REVENUECAT_REST_API_KEY) {
    await applyStorePremium(appUserId, await fetchStorePremiumFromRevenueCat(appUserId));
    return;
  }
  if (webhookEvent) {
    const inferred = inferStorePremiumFromEvent(webhookEvent);
    if (inferred) await applyStorePremium(appUserId, inferred);
  }
}
