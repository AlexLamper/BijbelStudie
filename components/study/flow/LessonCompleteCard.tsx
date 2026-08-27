'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, NotebookPen, PartyPopper, Sparkles } from 'lucide-react';

const TEAL = '#0D9488';
const AMBER = '#D97706';

export interface CompletionSummary {
  xpAwarded: number;
  levelledUp: boolean;
  newBadges: string[];
  studyCompleted: boolean;
  noteId: string | null;
  nextLessonDay: number | null;
}

/**
 * The end of a lesson.
 *
 * Shown after the last step rather than as a modal over it: finishing is the
 * destination, and a dialog that has to be dismissed makes an accomplishment
 * feel like an interruption.
 */
export default function LessonCompleteCard({
  studyId,
  studyTitle,
  lessonTitle,
  summary,
  quizScore,
  quizTotal,
  onContinue,
}: {
  studyId: string;
  studyTitle: string;
  lessonTitle: string;
  summary: CompletionSummary;
  quizScore: number | null;
  quizTotal: number | null;
  onContinue: () => void;
}) {
  const finished = summary.studyCompleted;

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-8 py-12 text-center">
      <div
        className="mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: finished ? 'rgba(217,119,6,0.12)' : 'rgba(13,148,136,0.1)' }}
      >
        {finished ? (
          <PartyPopper size={26} style={{ color: AMBER }} />
        ) : (
          <CheckCircle2 size={26} style={{ color: TEAL }} />
        )}
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1.5">
        {finished ? 'Studie afgerond' : 'Les afgerond'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-muted-foreground mb-6">
        {finished ? studyTitle : lessonTitle}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-7">
        {summary.xpAwarded > 0 && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: 'rgba(13,148,136,0.1)', color: TEAL }}
          >
            <Sparkles size={13} /> +{summary.xpAwarded} XP
          </span>
        )}
        {quizScore !== null && quizTotal !== null && quizTotal > 0 && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-secondary text-foreground">
            Quiz {quizScore}/{quizTotal}
          </span>
        )}
        {summary.levelledUp && (
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
          >
            Nieuw level
          </span>
        )}
        {summary.newBadges.length > 0 && (
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
          >
            {summary.newBadges.length === 1 ? 'Nieuwe badge' : `${summary.newBadges.length} nieuwe badges`}
          </span>
        )}
      </div>

      {summary.noteId && (
        <p className="mb-7 text-sm text-gray-500 dark:text-muted-foreground inline-flex items-center gap-1.5">
          <NotebookPen size={14} style={{ color: TEAL }} />
          Je reflectie is bewaard als notitie.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
        {summary.nextLessonDay != null && !finished ? (
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            Volgende les <ArrowRight size={15} />
          </button>
        ) : (
          <Link
            href={`/studies/${studyId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline"
            style={{ backgroundColor: TEAL }}
          >
            Terug naar de studie <ArrowRight size={15} />
          </Link>
        )}

        <Link
          href="/studies"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
        >
          Alle studies
        </Link>
      </div>
    </div>
  );
}
