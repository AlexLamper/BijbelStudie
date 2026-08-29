'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const TEAL = '#0D9488';

/**
 * What a server-side exception looks like to a reader.
 *
 * Without this file Next renders its own fallback: "Application error: a
 * server-side exception has occurred while loading www.bijbelstudie.io" plus a
 * digest. That is a stack trace with the stack removed - it tells the reader
 * nothing they can act on, and it looks like the site is broken rather than like
 * one request went wrong.
 *
 * The commonest cause here is a database blip: mongoose drops its socket, the
 * next query times out, and the page that happened to be loading throws. Those
 * recover on their own within a second or two, so the useful thing to offer is
 * the retry Next already hands us - `reset()` re-renders the segment without a
 * full page load.
 *
 * The digest is still shown, small and last. It is the only handle on the server
 * log for that specific failure, and someone reporting a bug can quote it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Onverwachte fout:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(217,119,6,0.12)' }}
        >
          <AlertTriangle size={22} style={{ color: '#D97706' }} />
        </span>

        <h1 className="text-xl font-bold text-foreground mb-1.5">Er ging iets mis</h1>
        <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
          Deze pagina kon even niet worden geladen. Meestal is dit tijdelijk - probeer het
          opnieuw. Je voortgang is bewaard.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={reset}
            className="press inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <RotateCcw size={15} /> Opnieuw proberen
          </button>
          <Link
            href="/dashboard"
            className="press inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Naar het dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-[11px] text-gray-400 dark:text-muted-foreground">
            Foutcode: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
