'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '../../hooks/use-toast';
import { forgetInviteCode, readInviteCode } from '../../lib/inviteStorage';

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

/**
 * Uses the invite code this browser kept from /uitnodiging, once there is an
 * account. Mounted for signed-in readers only; renders nothing, and fetches
 * nothing unless a code is waiting.
 *
 * The code is forgotten after any definite answer - the week started, or a
 * reason it cannot - and kept after a network or server error, so the next page
 * load tries again. A 401 (the session is still settling right after sign-up)
 * also keeps it.
 */
export default function ReferralClaim() {
  const router = useRouter();
  const { update } = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const code = readInviteCode();
    if (!code) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch('/api/v1/referral/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (res.status !== 200 && res.status !== 400) return;
        forgetInviteCode();
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; proUntil?: string | null; message?: string }
          | null;

        if (res.ok) {
          toast({
            title: 'Je week Pro is gestart',
            description: data?.proUntil
              ? `Je hebt Pro tot ${formatDay(data.proUntil)}. Veel studieplezier!`
              : 'Veel studieplezier!',
          });
          // The session reads Pro from the database, so refetching it is all it
          // takes for every paywall on the page to open.
          await update();
          router.refresh();
        } else if (data?.message) {
          toast({ title: 'Uitnodiging niet gebruikt', description: data.message });
        }
      } catch {
        // Offline: keep the code for the next page load.
      }
    })();
  }, [router, update]);

  return null;
}
