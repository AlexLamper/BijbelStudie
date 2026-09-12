'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, NotebookPen, Trophy } from 'lucide-react';
import { badgeDescription, badgeLabel } from '../../../lib/badgeCatalog';
import LessonTreeMoment from '../../levensboom/LessonTreeMoment';
import { INK, INK_FAINT, INK_MUTED, SURFACE } from './lesson-layout';
import PromptCard from '../../feedback/PromptCard';
import type { SerialisedPrompt } from '../../../lib/feedbackPrompts';

/**
 * The reward palette.
 *
 * A COLOUR alignment and nothing else: the sequence, the timings and the copy on
 * this screen are the reward-moments plan's and are untouched.
 *
 * Teal AS TYPE is `les-accent`, which is #0F766E on the light lesson and
 * #2DD4BF on the dark one; teal as a FILL under white type is #0D9488 in both.
 * Amber has to work on both grounds from one value, so it is the deep end
 * (#B45309, 4.8:1 on white and 5.3:1 on the night ground).
 */
const AMBER = '#B45309';
const AMBER_DEEP = '#B45309';
const AMBER_ON_DARK = '#B45309';
const FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-teal';

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
  ink,
  animate,
}: {
  pct: number;
  done: number;
  total: number;
  /** The stroke. A fill with no type on it, so it stays the plain brand. */
  accent: string;
  /** The figure inside it, which is type and so takes the on-dark shade. */
  ink: string;
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
          className="stroke-les-line"
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
        <span
          className="text-[26px] font-extrabold leading-none tabular-nums"
          style={{ color: ink }}
        >
          {pct}%
        </span>
        <span className={`mt-1 text-[11px] font-semibold tabular-nums ${INK_FAINT}`}>
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
  accentInk,
}: {
  value: string;
  label: string;
  /** The figure's ink, when it is one of the reward accents. */
  accentInk?: string;
}) {
  return (
    <div className={`${SURFACE} px-3 py-3 text-center`}>
      <p
        className={`text-[18px] font-bold leading-none tabular-nums truncate ${accentInk ? '' : INK}`}
        style={accentInk ? { color: accentInk } : undefined}
      >
        {value}
      </p>
      <p className={`mt-1.5 text-[11px] leading-snug truncate ${INK_FAINT}`}>
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
      style={{ borderColor: 'rgba(251,191,36,0.40)', backgroundColor: 'rgba(217,119,6,0.14)' }}
    >
      <Icon size={13} className="flex-none" style={{ color: AMBER_ON_DARK }} />
      <span className="text-[12px] font-bold" style={{ color: AMBER_ON_DARK }}>
        {label}
      </span>
      <span className={`text-[11.5px] ${INK_FAINT}`}>{detail}</span>
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
  guest = false,
  lessonHref,
  feedbackPrompt,
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
  /**
   * No session. Nothing was awarded and nothing was written, so the reward
   * figures would all read zero; the card shows the save gate instead - the
   * one moment a guest is asked for an account.
   */
  guest?: boolean;
  /** This lesson's URL, carried as `next` so signing in lands back here. */
  lessonHref?: string;
  /**
   * One short question, decided server-side and carried on the completion
   * response (app/api/v1/study-lesson-state). Null on all but a small
   * fraction of completions - see lib/feedbackEligibility.ts.
   */
  feedbackPrompt?: SerialisedPrompt | null;
}) {
  const reduceMotion = useReducedMotion();

  if (guest) {
    return (
      <GuestSaveGate
        studyId={studyId}
        studyTitle={studyTitle}
        lessonTitle={lessonTitle}
        lessonDay={lessonDay}
        lessonsTotal={lessonsTotal}
        passageReference={passageReference}
        nextLessonDay={summary.nextLessonDay}
        lessonHref={lessonHref ?? `/studie/${studyId}/${lessonDay}`}
        onContinue={onContinue}
        animate={!reduceMotion}
      />
    );
  }

  return (
    <SignedInCompletion
      studyId={studyId}
      studyTitle={studyTitle}
      lessonTitle={lessonTitle}
      lessonDay={lessonDay}
      lessonsTotal={lessonsTotal}
      lessonsCompleted={lessonsCompleted}
      passageReference={passageReference}
      minutes={minutes}
      summary={summary}
      quizScore={quizScore}
      quizTotal={quizTotal}
      nextLesson={nextLesson}
      onContinue={onContinue}
      reduceMotion={!!reduceMotion}
      feedbackPrompt={feedbackPrompt ?? null}
    />
  );
}

/**
 * The end of a lesson for a GUEST: what they just did, and the one ask.
 *
 * This is the point the owner named - "only at the end, when they've completed
 * a lesson and want to save progress, that's where they are obligated to log
 * in". So there is no XP figure (none was awarded), no badge, no note link; the
 * ring shows the lesson as done, and the card says plainly what an account
 * would have kept. Registreren is primary: a guest who got this far has a
 * lesson to save, not a password to remember. Both links carry the lesson as
 * `next` (the parameter app/inloggen and app/registreren read).
 *
 * Continuing without an account stays possible, quietly - the gate is on
 * saving, not on reading.
 */
function GuestSaveGate({
  studyId,
  studyTitle,
  lessonTitle,
  lessonDay,
  lessonsTotal,
  passageReference,
  nextLessonDay,
  lessonHref,
  onContinue,
  animate,
}: {
  studyId: string;
  studyTitle: string;
  lessonTitle: string;
  lessonDay: number;
  lessonsTotal: number;
  passageReference: string;
  nextLessonDay: number | null;
  lessonHref: string;
  onContinue: () => void;
  animate: boolean;
}) {
  const next = encodeURIComponent(lessonHref);
  // The one lesson just finished, as a share of the study: the ring has to
  // show something happened, and one out of N is the honest figure.
  const pct = lessonsTotal > 0 ? Math.round((1 / lessonsTotal) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto flex flex-col justify-center">
      <div className="mx-auto w-full max-w-[470px] px-5 py-6">
        <header className="text-center">
          <ProgressRing pct={pct} done={1} total={lessonsTotal} accent="var(--teal)" ink="var(--les-accent)" animate={animate} />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[1.1px] text-les-accent">
            Les {lessonDay} van {lessonsTotal} afgerond
          </p>
          <h1 className={`mt-1 text-[26px] font-bold leading-tight tracking-[-0.4px] text-balance ${INK}`}>
            {lessonTitle}
          </h1>
          <p className={`mt-1.5 text-[13px] ${INK_MUTED}`}>
            {studyTitle} · {passageReference}
          </p>
        </header>

        <section
          aria-labelledby="bewaar-titel"
          className={`${SURFACE} mt-6 px-5 py-5 sm:px-6`}
        >
          <h2 id="bewaar-titel" className={`text-[15px] font-bold ${INK}`}>
            Bewaar je voortgang
          </h2>
          <p className={`mt-1.5 text-[13.5px] leading-relaxed ${INK_MUTED}`}>
            Je hebt deze les zonder account gedaan, dus er is nog niets bewaard. Met een gratis
            account tellen je lessen mee, blijft je reflectie staan en groeit je boom vanaf hier.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link
              href={`/registreren?next=${next}`}
              data-track="guest_save_register"
              className={`press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-btn bg-teal text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90 ${FOCUS_RING}`}
            >
              Gratis account maken <ArrowRight size={15} />
            </Link>
            <Link
              href={`/inloggen?next=${next}`}
              data-track="guest_save_signin"
              className={`press inline-flex h-11 items-center justify-center rounded-btn border border-les-card-line px-4 text-[14px] font-medium ${INK} no-underline hover:bg-les-card ${FOCUS_RING}`}
            >
              Inloggen
            </Link>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {nextLessonDay != null && (
            <button
              type="button"
              onClick={onContinue}
              className={`inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium ${INK_MUTED} transition-colors hover:text-les-ink ${FOCUS_RING}`}
            >
              Verder met les {nextLessonDay} zonder account <ArrowRight size={13} />
            </button>
          )}
          <Link
            href={`/studies/${studyId}`}
            className={`inline-flex items-center rounded-md text-[13px] font-medium ${INK_MUTED} no-underline transition-colors hover:text-les-ink ${FOCUS_RING}`}
          >
            Overzicht
          </Link>
        </div>
      </div>
    </div>
  );
}

function SignedInCompletion({
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
  reduceMotion,
  feedbackPrompt,
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
  reduceMotion: boolean;
  feedbackPrompt: SerialisedPrompt | null;
}) {
  const finished = summary.studyCompleted;
  // One accent, in its three roles: the ring stroke carries no type, the solid
  // button carries white type, and the eyebrow IS type.
  const accent = finished ? AMBER : 'var(--teal)';
  const accentSolid = finished ? AMBER_DEEP : 'var(--teal)';
  const accentInk = finished ? AMBER_ON_DARK : 'var(--les-accent)';
  const hasQuiz = quizScore !== null && quizTotal !== null && quizTotal > 0;
  const done = Math.min(lessonsCompleted, lessonsTotal);
  const pct = lessonsTotal > 0 ? Math.round((done / lessonsTotal) * 100) : 0;
  const xp = useCountUp(summary.xpAwarded, !reduceMotion);

  return (
    <div className="h-full overflow-y-auto flex flex-col justify-center">
      <div className="mx-auto w-full max-w-[470px] px-5 py-6">
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
                ink={accentInk}
                animate={!reduceMotion}
              />
            }
          />

          <p
            className="mt-4 text-[11px] font-bold uppercase tracking-[1.1px]"
            style={{ color: accentInk }}
          >
            {finished ? 'Studie afgerond' : `Les ${lessonDay} van ${lessonsTotal} afgerond`}
          </p>
          <h1 className={`mt-1 text-[26px] font-bold leading-tight tracking-[-0.4px] text-balance ${INK}`}>
            {finished ? studyTitle : lessonTitle}
          </h1>
          <p className={`mt-1.5 text-[13px] ${INK_MUTED}`}>
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
        <div className="mt-6 grid grid-cols-2 gap-[11px] sm:grid-cols-4">
          <Stat
            value={summary.xpAwarded > 0 ? `+${xp}` : '0'}
            label="XP verdiend"
            accentInk="var(--les-accent)"
          />
          <Stat
            value={`${done}/${lessonsTotal}`}
            label={`${pct}% van de studie`}
            accentInk={accentInk}
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
            className={`mt-4 flex items-center gap-2 rounded-md text-[12.5px] no-underline ${INK_MUTED} transition-colors hover:text-les-ink ${FOCUS_RING}`}
          >
            <NotebookPen size={14} className="flex-none text-les-accent" />
            Je reflectie is bewaard als notitie
            <ArrowRight size={13} className="flex-none" />
          </Link>
        )}

        {nextLesson && !finished && (
          <div
            className="mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'rgba(45,212,191,0.35)' }}
          >
            <span
              className="h-8 w-8 flex-none rounded-lg flex items-center justify-center text-[12.5px] font-bold"
              style={{ backgroundColor: 'var(--teal-wash)', color: 'var(--les-accent)' }}
            >
              {nextLesson.day}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-[1.1px] text-les-accent">
                Hierna
              </span>
              <span className={`block text-[13px] font-semibold truncate ${INK}`}>
                {nextLesson.title} · {nextLesson.reference}
              </span>
            </span>
          </div>
        )}

        {/* The one short question, when there is one. Below the reward and the
            "Hierna" card, above the CTA row, so "Verder met les N" stays the
            dominant element - the reader must always be able to leave without
            touching this. See FEEDBACK_PLAN.md section 3.1. */}
        {feedbackPrompt && (
          <PromptCard
            prompt={feedbackPrompt}
            context={{ studyId, lessonDay, path: `/studie/${studyId}/${lessonDay}` }}
          />
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          {summary.nextLessonDay != null && !finished ? (
            <button
              type="button"
              onClick={onContinue}
              className={`press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-btn bg-teal text-[14px] font-semibold text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
            >
              Verder met les {summary.nextLessonDay} <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              href={`/studies/${studyId}`}
              className={`press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-btn text-[14px] font-semibold text-white no-underline transition-opacity hover:opacity-90 ${FOCUS_RING}`}
              style={{ backgroundColor: accentSolid }}
            >
              Terug naar de studie <ArrowRight size={15} />
            </Link>
          )}

          <Link
            href={`/studies/${studyId}`}
            className={`press inline-flex h-11 items-center justify-center rounded-btn border border-les-card-line px-4 text-[14px] font-medium ${INK} no-underline hover:bg-les-card ${FOCUS_RING}`}
          >
            Overzicht
          </Link>
        </div>
      </div>
    </div>
  );
}
