'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, NotebookPen, Trophy } from 'lucide-react';
import { badgeDescription, badgeLabel } from '../../../lib/badgeCatalog';
import LessonTreeMoment from '../../levensboom/LessonTreeMoment';

/**
 * The reward palette, in the roles components/scene/tokens.ts defines.
 *
 * This is a COLOUR alignment and nothing else: the sequence, the timings and the
 * copy on this screen are the reward-moments plan's and are untouched. What
 * changes is which shade plays which part. TEAL and AMBER stay the fills that
 * carry no type - the ring stroke, a dot. Anything with white type on it drops
 * to the deep end of the same swatch (white on #0D9488 is 3.74:1, on #0F766E
 * 5.5:1; white on #D97706 is 3.2:1, on #B45309 5.9:1). And the brand AS type
 * has to move with the theme, because this card is light in one and dark in the
 * other - hence class pairs rather than values, since an inline `style` cannot
 * answer dark mode.
 */
const TEAL = '#0D9488';
const AMBER = '#D97706';
const TEAL_DEEP = '#0F766E';
const AMBER_DEEP = '#B45309';
const INK_TEAL = 'text-[#0F766E] dark:text-[#2DD4BF]';
const INK_AMBER = 'text-[#B45309] dark:text-[#FBBF24]';
const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-white';

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

/**
 * Counts up to `target` once, on mount.
 *
 * The XP figure is the reward, and a number that lands already at rest reads
 * like a receipt. A short climb reads like something being awarded. It runs
 * once and stops - nothing here re-animates on a re-render, and with reduced
 * motion the value is simply there.
 */
function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target);
      return;
    }
    const duration = 900;
    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      // Ease-out cubic: fast first, so the figure is legible almost at once.
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return value;
}

/**
 * Progress through the study, as a ring.
 *
 * This replaces both the decorative icon medallion that used to open the card
 * and the thin progress bar further down it - one figure, drawn once, instead
 * of an ornament plus a duplicate of a number already in the stats row. The
 * stroke animates from empty on mount, which is the only movement on the
 * screen and so reads as the accomplishment landing.
 */
function ProgressRing({
  pct,
  done,
  total,
  accent,
  inkClass,
  animate,
}: {
  pct: number;
  done: number;
  total: number;
  /** The stroke. A fill with no type on it, so it stays the plain brand. */
  accent: string;
  /** The figure inside it, which is type and therefore theme-dependent. */
  inkClass: string;
  animate: boolean;
}) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const [drawn, setDrawn] = useState(animate ? 0 : pct);

  useEffect(() => {
    if (!animate) {
      setDrawn(pct);
      return;
    }
    // A frame's delay so the browser paints the empty ring first; without it
    // the transition has no start state to move from.
    const id = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(id);
  }, [pct, animate]);

  return (
    <div className="relative mx-auto h-[116px] w-[116px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-gray-200 dark:stroke-secondary"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={accent}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * drawn) / 100}
          style={{ transition: animate ? 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1)' : undefined }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[26px] font-extrabold leading-none tabular-nums ${inkClass}`}>
          {pct}%
        </span>
        <span className="mt-1 text-[11px] font-semibold tabular-nums text-gray-600 dark:text-muted-foreground">
          {done}/{total} lessen
        </span>
      </div>
      <span className="sr-only">
        {done} van {total} lessen afgerond, {pct} procent
      </span>
    </div>
  );
}

/** One figure and its label. No icon tile - see the note on density below. */
function Stat({
  value,
  label,
  accentClass,
}: {
  value: string;
  label: string;
  /** A class pair, not a colour: this figure is type and the card has two themes. */
  accentClass?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card px-3 py-3 text-center">
      <p
        className={`text-[18px] font-bold leading-none tabular-nums truncate ${accentClass ?? ''}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-gray-600 dark:text-muted-foreground leading-snug truncate">
        {label}
      </p>
    </div>
  );
}

/** A level-up or a newly earned badge. Named, never rendered as its id. */
function RewardChip({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof Trophy;
  label: string;
  detail: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
      style={{ borderColor: 'rgba(180,83,9,0.40)', backgroundColor: 'rgba(217,119,6,0.08)' }}
    >
      <Icon size={13} className={`flex-none ${INK_AMBER}`} />
      <span className={`text-[12px] font-bold ${INK_AMBER}`}>{label}</span>
      <span className="text-[11.5px] text-gray-600 dark:text-muted-foreground">{detail}</span>
    </span>
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
 * lesson is.
 *
 * Two later corrections. Badges arrive from the API as ids and were printed
 * raw, so a tenth completed study congratulated the reader with the word
 * "completed10"; they now go through lib/badgeCatalog. And the header's icon
 * medallion plus the separate progress bar were two pieces of furniture saying
 * less than one ring does, so they became the ring - the only animated thing on
 * the screen, alongside the XP figure counting up to what was awarded.
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
  const reduceMotion = useReducedMotion();
  const finished = summary.studyCompleted;
  // One accent, in its three roles: the ring stroke carries no type, the solid
  // button carries white type, and the eyebrow IS type.
  const accent = finished ? AMBER : TEAL;
  const accentSolid = finished ? AMBER_DEEP : TEAL_DEEP;
  const accentInk = finished ? INK_AMBER : INK_TEAL;
  const hasQuiz = quizScore !== null && quizTotal !== null && quizTotal > 0;
  const done = Math.min(lessonsCompleted, lessonsTotal);
  const pct = lessonsTotal > 0 ? Math.round((done / lessonsTotal) * 100) : 0;
  const xp = useCountUp(summary.xpAwarded, !reduceMotion);

  return (
    <div className="h-full overflow-y-auto flex flex-col justify-center">
      <div className="mx-auto w-full max-w-xl px-5 sm:px-8 py-6">
        <header className="text-center">
          {/* The reader's own tree, with what this lesson just did to it: the
              XP is already applied, so new leaves are open and a level-up grows
              its new wood in. The ring stands in for a reader without a tree. */}
          <LessonTreeMoment
            xpAwarded={summary.xpAwarded}
            levelledUp={summary.levelledUp}
            fallback={
              <ProgressRing
                pct={pct}
                done={done}
                total={lessonsTotal}
                accent={accent}
                inkClass={accentInk}
                animate={!reduceMotion}
              />
            }
          />

          <p className={`mt-4 text-[11px] font-bold uppercase tracking-[0.14em] ${accentInk}`}>
            {finished ? 'Studie afgerond' : `Les ${lessonDay} van ${lessonsTotal} afgerond`}
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-foreground leading-tight text-balance">
            {finished ? studyTitle : lessonTitle}
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-600 dark:text-muted-foreground">
            {finished
              ? `Alle ${lessonsTotal} lessen zijn af. Sterk volgehouden.`
              : `${studyTitle} · ${passageReference}`}
          </p>

          {(summary.levelledUp || summary.newBadges.length > 0) && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {summary.levelledUp && (
                <RewardChip icon={Trophy} label="Nieuw level" detail="bereikt" />
              )}
              {summary.newBadges.map((badge) => (
                <RewardChip
                  key={badge}
                  icon={Award}
                  label={badgeLabel(badge)}
                  detail={badgeDescription(badge)}
                />
              ))}
            </div>
          )}
        </header>

        {/* Four figures, one row. The quiz result is one of them rather than a
            card of its own - it is a number with a label, like the rest. */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            value={summary.xpAwarded > 0 ? `+${xp}` : '0'}
            label="XP verdiend"
            accentClass={INK_TEAL}
          />
          <Stat
            value={`${done}/${lessonsTotal}`}
            label={`${pct}% van de studie`}
            accentClass={accentInk}
          />
          {hasQuiz ? (
            <Stat value={`${quizScore}/${quizTotal}`} label={scoreLabel(quizScore, quizTotal)} />
          ) : (
            <Stat value={passageReference} label="Gelezen" />
          )}
          <Stat value={`${minutes} min`} label="Leestijd" />
        </div>

        {summary.noteId && (
          <Link
            href="/notities"
            className="mt-4 flex items-center gap-2 rounded-md text-[12.5px] no-underline text-gray-600 dark:text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
          >
            <NotebookPen size={14} className={`flex-none ${INK_TEAL}`} />
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
              className={`h-8 w-8 flex-none rounded-lg flex items-center justify-center text-[12.5px] font-bold ${INK_TEAL}`}
              style={{ backgroundColor: 'rgba(13,148,136,0.12)' }}
            >
              {nextLesson.day}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${INK_TEAL}`}>
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
              className={`press flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              Verder met les {summary.nextLessonDay} <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              href={`/studies/${studyId}`}
              className={`press flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 ${FOCUS_RING}`}
              style={{ backgroundColor: accentSolid }}
            >
              Terug naar de studie <ArrowRight size={15} />
            </Link>
          )}

          <Link
            href={`/studies/${studyId}`}
            className="press inline-flex items-center justify-center px-4 h-11 rounded-xl text-sm font-medium border border-gray-200 dark:border-border bg-white dark:bg-card text-foreground no-underline hover:bg-gray-50 dark:hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
          >
            Overzicht
          </Link>
        </div>
      </div>
    </div>
  );
}
