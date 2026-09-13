'use client';

import { useSession } from 'next-auth/react';

/**
 * Whether the signed-in reader is Pro, for every Pro mark drawn on the web.
 *
 * The one client-side source of truth: `session.user.isSubscribed` is set in
 * lib/authOptions by `resolveIsPro` (Stripe OR an App Store / Play purchase OR
 * an admin grant) - the same helper /api/v1/* uses for `auth.isPro`, and the
 * same flag the paywall and /abonnement act on.
 *
 * Do not derive Pro from anything else on the client. The studio ring
 * (`levensboom.avatar.ring === 'goud'`) is a cosmetic choice a Pro reader can
 * switch off, and `/api/user`'s `subscribed` is only the Stripe flag - both
 * disagreed with this one for some accounts, which is how the sidebar and the
 * top bar ended up drawing different avatars for the same person.
 */
export function useIsPro(): boolean {
  const { data } = useSession();
  return data?.user?.isSubscribed === true;
}
