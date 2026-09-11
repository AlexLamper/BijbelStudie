'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STEP_ORDER } from '../../lib/studyFlow';
import { GUEST_LESSON_PREFIX, migrateGuestLessons } from '../../lib/guestLessons';

/**
 * Carries a guest's finished lessons onto the account they just made.
 *
 * Mounted in the root layout for signed-in readers only. It does nothing at all
 * - no state, no fetch, no render - unless this browser holds guest lesson
 * entries, which is the normal case for everyone who already had an account.
 *
 * Why here and not on the sign-in page: the guest can arrive at an account from
 * the save gate at the end of a lesson, from the GuestGate card on any
 * account-bound page, from /registreren directly, or from a Google sign-in that
 * lands on whatever `next` said. One mount in the layout covers all of them,
 * and the entries are cleared as they are replayed, so a second render is a
 * no-op rather than a double grant.
 *
 * The confirmation is deliberately small and self-dismissing. The reader is
 * mid-flow; what they need to know is that the lesson they ran before signing
 * up counted, not a dialog to acknowledge.
 */
export default function GuestProgressMigration() {
  const router = useRouter();
  const ran = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Cheapest possible check first: touching localStorage at all is the only
    // cost for the overwhelming majority of page loads, which have nothing to
    // migrate.
    let hasGuestWork = false;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        if (localStorage.key(i)?.startsWith(GUEST_LESSON_PREFIX)) {
          hasGuestWork = true;
          break;
        }
      }
    } catch {
      return;
    }
    if (!hasGuestWork) return;

    let cancelled = false;

    void migrateGuestLessons(STEP_ORDER)
      .then((result) => {
        if (cancelled || result.migrated === 0) return;
        setMessage(
          result.completed > 0
            ? result.completed === 1
              ? 'Je afgeronde les is aan je account toegevoegd.'
              : `Je ${result.completed} afgeronde lessen zijn aan je account toegevoegd.`
            : 'Waar je was gebleven is aan je account toegevoegd.',
        );
        // The dashboard, the study list and the tree all read server data that
        // just changed underneath them.
        router.refresh();
      })
      .catch(() => {
        /* a failed replay keeps its entries and is retried on the next load */
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
      style={{ backgroundColor: '#0D9488' }}
    >
      {message}
    </div>
  );
}
