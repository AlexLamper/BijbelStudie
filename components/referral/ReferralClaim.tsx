'use client';

import { useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SessionContext } from 'next-auth/react';
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
  // Read directly from context, not `useSession`: this is mounted in the root
  // layout, which has no SessionProvider (each route layout mounts its own,
  // below this). There `useSession` throws in development and returns
  // undefined in production, so destructuring it would take down every page
  // for every signed-in reader. Same pattern as components/study/SpeakButton.tsx.
  const update = useContext(SessionContext)?.update;
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
          // The session reads Pro from the database. The refresh re-runs the
          // server render, so every layout reads the new Pro state; `update`
          // only exists when a provider sits above this component, which in the
          // root layout it does not. A route's own SessionProvider keeps the
          // session it mounted with until the next navigation or load (the Pro
          // offer dialog already handles a stale session the same way).
          await update?.();
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
