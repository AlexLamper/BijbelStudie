/**
 * Entitlement resolution.
 *
 * A user can be Pro through more than one channel at once, and the answer is
 * the OR of all of them. In particular: someone who subscribed on the website
 * through Stripe keeps Pro inside the iOS app for free. That is Apple's
 * multiplatform exception (guideline 3.1.1) and it is the reason the app must
 * never show them a purchase button.
 */

export type ProSource = 'stripe' | 'apple' | 'google' | 'admin' | null;

export type PremiumUserFields = {
  subscribed?: boolean;
  isAdmin?: boolean;
  storePremium?: boolean;
  storePremiumPlatform?: 'apple' | 'google' | null;
  storePremiumExpiresAt?: Date | null;
};

export function resolveIsPro(user: PremiumUserFields, adminByEmail = false): boolean {
  return Boolean(user.subscribed || user.storePremium || user.isAdmin || adminByEmail);
}

export function resolveProSource(user: PremiumUserFields, adminByEmail = false): ProSource {
  // Store purchases win the label because that is the one the app can act on
  // (manage subscription, restore). Stripe is second. Admin is a fallback.
  if (user.storePremium) return user.storePremiumPlatform ?? 'apple';
  if (user.subscribed) return 'stripe';
  if (user.isAdmin || adminByEmail) return 'admin';
  return null;
}

export function resolveProExpiresAt(user: PremiumUserFields): Date | null {
  return user.storePremium ? (user.storePremiumExpiresAt ?? null) : null;
}
