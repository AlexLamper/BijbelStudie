'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ListChecks,
  NotebookPen,
  PartyPopper,
  PenLine,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { STEP_LABELS } from './StudyStepRail';
import type { StepKey } from '../../../lib/studyFlow';

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

const STEP_ICON: Record<StepKey, typeof Compass> = {
  intro: Compass,
  word: BookOpen,
  depth: Layers,
  reflection: PenLine,
  quiz: Trophy,
};

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

/** A progress ring. Plain SVG - a chart library for one circle is not worth 40 kB. */
function ScoreRing({ score, total }: { score: number; total: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? score / total : 0;

  return (
    <div className="relative h-[86px] w-[86px] flex-none">
      <svg viewBox="0 0 86 86" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="43"
          cy="43"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-gray-200 dark:stroke-secondary"
        />
        <circle
          cx="43"
          cy="43"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={TEAL}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground leading-none tabular-nums">{score}</span>
        <span className="text-[11px] text-gray-400 dark:text-muted-foreground leading-none mt-0.5">
          van {total}
        </span>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof Sparkles;
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3.5">
      <span
        className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent ?? TEAL}1A` }}
      >
        <Icon size={14} style={{ color: accent ?? TEAL }} />
      </span>
      <p className="text-lg font-bold text-foreground leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11.5px] text-gray-500 dark:text-muted-foreground leading-snug">
        {label}
      </p>
    </div>
  );
}

/**
 * The end of a lesson.
 *
 * Shown after the last step rather than as a modal over it: finishing is the
 * destination, and a dialog that has to be dismissed makes an accomplishment
 * feel like an interruption.
 *
 * It is deliberately a full screen rather than a single line of confirmation.
 * This is the only moment the reader sees what a lesson actually amounted to -
 * the passage, the score, the note it produced, how far into the study they now
 * are, and what comes next. A bare "Les afgerond" threw all of that away and
 * left the one useful control, "volgende les", floating in white space.
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
  steps,
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
  steps: StepKey[];
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-8 sm:py-12">
        {/* Hero */}
        <header className="text-center mb-8">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: finished ? 'rgba(217,119,6,0.12)' : 'rgba(13,148,136,0.1)' }}
          >
            {finished ? (
              <PartyPopper size={24} style={{ color: AMBER }} />
            ) : (
              <CheckCircle2 size={24} style={{ color: TEAL }} />
            )}
          </div>

          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: finished ? AMBER : TEAL }}
          >
            {finished ? 'Studie afgerond' : `Les ${lessonDay} van ${lessonsTotal} afgerond`}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {finished ? studyTitle : lessonTitle}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-muted-foreground">
            {finished
              ? `Alle ${lessonsTotal} lessen zijn af. Sterk volgehouden.`
              : `${studyTitle} · ${passageReference}`}
          </p>

          {(summary.levelledUp || summary.newBadges.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {summary.levelledUp && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
                  style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
                >
                  <Sparkles size={12} /> Nieuw level bereikt
                </span>
              )}
              {summary.newBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
                  style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: AMBER }}
                >
                  <Trophy size={12} /> {badge}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Quiz result, when there was one. The one number worth its own card. */}
        {hasQuiz && (
          <section className="mb-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5 flex items-center gap-5">
            <ScoreRing score={quizScore} total={quizTotal} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: TEAL }}>
                Toetsing
              </p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {scoreLabel(quizScore, quizTotal)}
              </p>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                {quizScore === quizTotal
                  ? `Alle ${quizTotal} vragen over ${passageReference} goed beantwoord.`
                  : `${quizScore} van ${quizTotal} vragen goed. De uitleg bij elke vraag staat in de quizstap.`}
              </p>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat
            icon={Sparkles}
            value={summary.xpAwarded > 0 ? `+${summary.xpAwarded}` : '0'}
            label="XP verdiend"
          />
          <Stat icon={BookOpen} value={passageReference} label="Gelezen gedeelte" />
          <Stat icon={Clock} value={`${minutes} min`} label="Geschatte leestijd" />
          <Stat
            icon={ListChecks}
            value={`${done}/${lessonsTotal}`}
            label={finished ? 'Alle lessen af' : `Nog ${remaining} te gaan`}
            accent={finished ? AMBER : TEAL}
          />
        </section>

        {/* Study progress */}
        <section className="mb-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="text-sm font-bold text-foreground">Voortgang in deze studie</h2>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: TEAL }}>
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: finished ? AMBER : TEAL,
                transition: 'width 700ms ease',
              }}
            />
          </div>
          <p className="mt-2.5 text-[12.5px] text-gray-500 dark:text-muted-foreground">
            {finished
              ? 'Je kunt elke les opnieuw openen om terug te lezen.'
              : `Je hebt ${done} van de ${lessonsTotal} lessen van "${studyTitle}" afgerond.`}
          </p>
        </section>

        {/* What this lesson consisted of */}
        <section className="mb-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Wat je deze les hebt gedaan</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step) => {
              const Icon = STEP_ICON[step];
              return (
                <li key={step} className="flex items-center gap-2.5">
                  <span
                    className="h-7 w-7 flex-none rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                  >
                    <Icon size={13} style={{ color: TEAL }} />
                  </span>
                  <span className="text-[13px] text-foreground">{STEP_LABELS[step]}</span>
                  <CheckCircle2 size={14} className="ml-auto flex-none" style={{ color: TEAL }} />
                </li>
              );
            })}
          </ul>

          {summary.noteId && (
            <Link
              href="/notities"
              className="mt-4 flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-border p-3 no-underline hover:bg-gray-50 dark:hover:bg-secondary transition-colors"
            >
              <span
                className="h-8 w-8 flex-none rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
              >
                <NotebookPen size={14} style={{ color: TEAL }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-foreground">
                  Je reflectie is bewaard als notitie
                </span>
                <span className="block text-[11.5px] text-gray-500 dark:text-muted-foreground">
                  Terug te lezen bij Notities
                </span>
              </span>
              <ArrowRight size={14} className="flex-none" style={{ color: TEAL }} />
            </Link>
          )}
        </section>

        {/* What comes next */}
        {nextLesson && !finished && (
          <section className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'rgba(13,148,136,0.35)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: TEAL }}>
              Hierna
            </p>
            <div className="flex items-center gap-3">
              <span
                className="h-9 w-9 flex-none rounded-lg flex items-center justify-center text-[13px] font-bold"
                style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }}
              >
                {nextLesson.day}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {nextLesson.title}
                </p>
                <p className="text-[12px] text-gray-500 dark:text-muted-foreground truncate">
                  {nextLesson.reference}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {summary.nextLessonDay != null && !finished ? (
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Verder met les {summary.nextLessonDay} <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              href={`/studies/${studyId}`}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
              style={{ backgroundColor: finished ? AMBER : TEAL }}
            >
              Terug naar de studie <ArrowRight size={15} />
            </Link>
          )}

          <Link
            href={`/studies/${studyId}`}
            className="inline-flex items-center justify-center px-5 h-11 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Overzicht
          </Link>
          <Link
            href="/studies"
            className="inline-flex items-center justify-center px-5 h-11 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary"
          >
            Alle studies
          </Link>
        </div>
      </div>
    </div>
  );
}
