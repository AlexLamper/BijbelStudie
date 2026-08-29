'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const TEAL = '#0D9488';

/**
 * A failure inside a study, handled without throwing the reader out of it.
 *
 * This segment reads StudyEnrollment, StudyLessonState and StudyProgress on
 * every request, so a dropped mongoose socket surfaces here first - as
 * "Operation `studyenrollments.findOne()` buffering timed out", rendered by Next
 * as a bare "Application error" page with a digest. lib/mongodb now reconnects
 * instead of handing back a dead connection, but a database can still be down,
 * and when it is the reader should see a sentence and a retry button rather than
 * a stack trace with the stack removed.
 *
 * `reset()` re-renders this segment only, so a retry that succeeds lands the
 * reader back on the exact lesson they were opening.
 */
export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Studie kon niet worden geladen:', error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(217,119,6,0.12)' }}
        >
          <AlertTriangle size={22} style={{ color: '#D97706' }} />
        </span>

        <h1 className="text-xl font-bold text-foreground mb-1.5">
          De studie kon even niet worden geladen
        </h1>
        <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
          Dit is bijna altijd tijdelijk. Je voortgang, je reflectie en je quizantwoorden zijn
          bewaard - probeer het opnieuw.
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
            href="/studies"
            className="press inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Alle studies
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
