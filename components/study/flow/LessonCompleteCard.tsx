'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, NotebookPen, PartyPopper, Trophy } from 'lucide-react';

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

export interface NextLessonPreview {
  day: number;
  title: string;
  reference: string;
}

/** How a score reads back to the reader. Never a failing grade - this is devotional. */
function scoreLabel(score: number, total: number): string {
  if (total === 0) return '';
  const ratio = score / total;
  if (ratio === 1) return 'Alles goed';
  if (ratio >= 0.8) return 'Sterk gedaan';
  if (ratio >= 0.6) return 'Goed bezig';
  if (ratio >= 0.4) return 'Op de helft';
  return 'Nog even teruglezen';
}

/** One figure and its label. No icon tile - see the note on density below. */
function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-2.5 text-center">
      <p
        className="text-[17px] font-bold leading-none tabular-nums truncate"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-muted-foreground leading-snug truncate">
        {label}
      </p>
    </div>
  );
}

/**
 * The end of a lesson: one screen, no scrolling.
 *
 * Shown after the last step rather than as a modal over it - finishing is the
 * destination, and a dialog that has to be dismissed makes an accomplishment
 * feel like an interruption.
 *
 * It USED to be a stack of five bordered sections - a score card with an 86px
 * ring, four icon-tiled stats, a progress card, a checklist of the five steps
 * you had just done, and a "hierna" card - roughly 1100px of page. Every one of
 * them was defensible on its own and together they meant the reader had to
 * scroll past their own reward to reach "Verder met les 4". Reading a
 * congratulation in instalments is not a congratulation.
 *
 * What survives is what someone actually wants to know at that moment: that they
 * finished, what it earned, how far along they now are, and where the next
 * lesson is. The step checklist is gone - they had just done those five steps,
 * in order, seconds ago - and the stats lost their icon tiles, which were
 * decoration standing in for information.
 *
 * `justify-center` with `overflow-y-auto` underneath: the content is sized to
 * fit a laptop window with room to spare, and the scroll is only a safety valve
 * so nothing becomes unreachable in a very short window (a phone in landscape).
 */
export default function LessonCompleteCard({
  studyId,
  studyTitle,
  lessonTitle,
  lessonDay,
  lessonsTotal,
  lessonsCompleted,
  passageReference,
  minutes,
  summary,
  quizScore,
  quizTotal,
  nextLesson,
  onContinue,
}: {
  studyId: string;
  studyTitle: string;
  lessonTitle: string;
  lessonDay: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  passageReference: string;
  minutes: number;
  summary: CompletionSummary;
  quizScore: number | null;
  quizTotal: number | null;
  nextLesson: NextLessonPreview | null;
  onContinue: () => void;
}) {
  const finished = summary.studyCompleted;
  const hasQuiz = quizScore !== null && quizTotal !== null && quizTotal > 0;
  const done = Math.min(lessonsCompleted, lessonsTotal);
  const pct = lessonsTotal > 0 ? Math.round((done / lessonsTotal) * 100) : 0;
  const remaining = Math.max(lessonsTotal - done, 0);

  return (
    <div className="h-full overflow-y-auto flex flex-col justify-center">
      <div className="mx-auto w-full max-w-xl px-5 sm:px-8 py-6">
        <header className="text-center">
          <div
            className="mx-auto mb-3 h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: finished ? 'rgba(217,119,6,0.12)' : 'rgba(13,148,136,0.1)' }}
          >
            {finished ? (
              <PartyPopper size={22} style={{ color: AMBER }} />
            ) : (
              <CheckCircle2 size={22} style={{ color: TEAL }} />
            )}
          </div>

          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-1"
            style={{ color: finished ? AMBER : TEAL }}
          >
            {finished ? 'Studie afgerond' : `Les ${lessonDay} van ${lessonsTotal} afgerond`}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {finished ? studyTitle : lessonTitle}
          </h1>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">
            {finished
              ? `Alle ${lessonsTotal} lessen zijn af. Sterk volgehouden.`
              : `${studyTitle} · ${passageReference}`}
          </p>

          {(summary.levelledUp || summary.newBadges.length > 0) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
              {summary.levelledUp && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold"
                  style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
                >
                  <Trophy size={11} /> Nieuw level
                </span>
              )}
              {summary.newBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold"
                  style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
                >
                  <Trophy size={11} /> {badge}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Four figures, one row. The quiz result is one of them rather than a
            card of its own - it is a number with a label, like the rest. */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            value={summary.xpAwarded > 0 ? `+${summary.xpAwarded}` : '0'}
            label="XP verdiend"
            accent={TEAL}
          />
          {hasQuiz ? (
            <Stat value={`${quizScore}/${quizTotal}`} label={scoreLabel(quizScore, quizTotal)} />
          ) : (
            <Stat value={passageReference} label="Gelezen" />
          )}
          <Stat value={`${minutes} min`} label="Leestijd" />
          <Stat
            value={`${done}/${lessonsTotal}`}
            label={finished ? 'Alle lessen af' : `Nog ${remaining} te gaan`}
            accent={finished ? AMBER : undefined}
          />
        </div>

        {/* Progress, as a labelled bar rather than a titled section. */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-foreground">
              Voortgang in deze studie
            </span>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: TEAL }}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: finished ? AMBER : TEAL,
                transition: 'width 700ms ease',
              }}
            />
          </div>
        </div>

        {summary.noteId && (
          <Link
            href="/notities"
            className="mt-3 flex items-center gap-2 text-[12.5px] no-underline text-gray-500 dark:text-muted-foreground hover:text-foreground transition-colors"
          >
            <NotebookPen size={14} className="flex-none" style={{ color: TEAL }} />
            Je reflectie is bewaard als notitie
            <ArrowRight size={13} className="flex-none" />
          </Link>
        )}

        {nextLesson && !finished && (
          <div
            className="mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'rgba(13,148,136,0.35)' }}
          >
            <span
              className="h-8 w-8 flex-none rounded-lg flex items-center justify-center text-[12.5px] font-bold"
              style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }}
            >
              {nextLesson.day}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
                Hierna
              </span>
              <span className="block text-[13px] font-semibold text-foreground truncate">
                {nextLesson.title} · {nextLesson.reference}
              </span>
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          {summary.nextLessonDay != null && !finished ? (
            <button
              type="button"
              onClick={onContinue}
              className="press flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Verder met les {summary.nextLessonDay} <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              href={`/studies/${studyId}`}
              className="press flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: finished ? AMBER : TEAL }}
            >
              Terug naar de studie <ArrowRight size={15} />
            </Link>
          )}

          <Link
            href={`/studies/${studyId}`}
            className="press inline-flex items-center justify-center px-4 h-11 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Overzicht
          </Link>
        </div>
      </div>
    </div>
  );
}
