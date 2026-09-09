'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

import RoadRibbon from './RoadRibbon';
import RouteHorizon, { type RouteMark } from './RouteHorizon';
import { TEAL, stopCount, type RouteArt } from './routeArt';

/**
 * The close - the loudest moment in the flow, and the one this variant spends
 * its weight on.
 *
 * The research is unambiguous about this: every unit of work needs entry, work,
 * close and a return hook, and the close is where the retention actually sits
 * (LEARNING_UX_RESEARCH.md §2.2, §1.2). So this screen answers three questions
 * in order and then names one next action:
 *
 *   1. What did you just walk?      the stop, the passage, the minutes
 *   2. What did it add?             the road advanced, XP, the remainder to the
 *                                   next level and what that unlocks
 *   3. Where does it go next?       "Morgen: stop 5 — Handelingen 2:22-36"
 *
 * The beat order follows `docs/reward-moments-plan.md` §3.3 rather than being
 * invented here: XP and the road move together from 60 ms and land at ~960 ms,
 * the streak beat arrives at 1000 ms, the unlock chip at 1400 ms, and the
 * primary action becomes prominent at 1600 ms. Under `prefers-reduced-motion`
 * all of it is simply already there. Nothing waits on a network round trip -
 * this is a screen, not a write - which is the one engineering fact Duolingo
 * published about their own session end.
 *
 * No tree here, deliberately. The reward object of this variant is the road,
 * and the tree belongs to the reader's own progress rather than to a study.
 */

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

/** Counts up once, ease-out cubic, 900 ms. Same curve as the existing card. */
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
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return value;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-2.5">
      <p className="truncate text-[15px] font-bold leading-none tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11px] leading-snug text-gray-500 dark:text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default function WalkClose({
  studyId,
  studyTitle,
  lessonTitle,
  day,
  lessonsTotal,
  doneBefore,
  reference,
  minutes,
  art,
  xpAwarded,
  level,
  remainingXp,
  nextUnlock,
  streak,
  weekDone,
  next,
  nextWhen,
}: {
  studyId: string;
  studyTitle: string;
  lessonTitle: string;
  day: number;
  lessonsTotal: number;
  /** Stops behind you before this one was finished. */
  doneBefore: number;
  reference: string;
  minutes: number;
  art: RouteArt;
  xpAwarded: number;
  level: number;
  remainingXp: number;
  nextUnlock: string;
  streak: number;
  /** Seven booleans, Monday first. */
  weekDone: boolean[];
  next: { day: number; title: string; reference: string } | null;
  /** "Morgen", "Woensdag" - when the next stop is due, in the reader's rhythm. */
  nextWhen: string;
}) {
  const reduce = useReducedMotion();
  const done = Math.min(doneBefore + 1, lessonsTotal);
  const before = lessonsTotal > 0 ? doneBefore / lessonsTotal : 0;
  const after = lessonsTotal > 0 ? done / lessonsTotal : 0;
  const finished = done >= lessonsTotal;

  const xp = useCountUp(xpAwarded, !reduce);
  /** 0 = just mounted, 1 = streak beat, 2 = unlock chip, 3 = action prominent. */
  const [beat, setBeat] = useState(reduce ? 3 : 0);
  const [walked, setWalked] = useState(reduce ? after : before);

  useEffect(() => {
    if (reduce) {
      setBeat(3);
      setWalked(after);
      return;
    }
    const timers = [
      window.setTimeout(() => setWalked(after), 60),
      window.setTimeout(() => setBeat(1), 1000),
      window.setTimeout(() => setBeat(2), 1400),
      window.setTimeout(() => setBeat(3), 1600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduce, after]);

  const marks: RouteMark[] = [{ t: (done - 0.5) / Math.max(1, lessonsTotal), done: true, current: true }];

  const arrive = (visible: boolean) =>
    [
      'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
    ].join(' ');

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8">
        <header className="text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
            {finished ? 'Route uitgelopen' : `Stop ${day} van ${lessonsTotal} gelopen`}
          </p>
          <h2 className="mt-1.5 text-2xl font-bold leading-tight text-foreground text-balance">
            {finished ? studyTitle : lessonTitle}
          </h2>
          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-muted-foreground">
            {finished
              ? `Alle ${stopCount(lessonsTotal)} liggen achter je. Sterk volgehouden.`
              : `${studyTitle} · ${reference}`}
          </p>
        </header>

        {/* The road, with this stop now behind you. The picture is static; the
            movement is the strip under it, which is a CSS width transition
            rather than a redraw - nothing here needs a canvas. */}
        <div className="mt-6">
          <RouteHorizon
            art={art}
            ratio={16 / 5}
            walked={after}
            marks={marks}
            label={`Routebeeld bij ${studyTitle} — de weg tot en met stop ${day}`}
            className="rounded-2xl border border-gray-200 dark:border-border"
          />
          <div className="mt-3">
            <RoadRibbon progress={walked} thickness={10} />
            <p className="mt-2 flex items-center justify-between gap-3 text-[12px] tabular-nums">
              <span className="font-semibold" style={{ color: TEAL }}>
                {done} van {lessonsTotal} stops gelopen
              </span>
              <span className="text-gray-500 dark:text-muted-foreground">
                {finished ? 'de hele weg' : `nog ${lessonsTotal - done} te gaan`}
              </span>
            </p>
          </div>
        </div>

        {/* Wat je gelopen hebt. */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Fact label="Gelezen" value={reference} />
          <Fact label="Onderweg" value={`${minutes} min`} />
          <Fact label="Verdiend" value={xpAwarded > 0 ? `+${xp} XP` : '0 XP'} />
        </div>

        {/* Wat het opleverde. Remainder-first, and the reward is named: the
            goal-gradient framing the reward plan asks for, without a word about
            what you have failed to do. */}
        <p className={`mt-3 text-center text-[12.5px] text-gray-500 dark:text-muted-foreground ${arrive(beat >= 2)}`}>
          Nog{' '}
          <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
            {remainingXp} XP
          </span>{' '}
          tot niveau {level + 1} — dan komt de {nextUnlock} vrij.
        </p>

        {/* De reeks. Encouragement, never a threat: no countdown, no loss copy,
            and the filled days differ in shape as well as in colour. */}
        <section
          className={`mt-5 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4 ${arrive(beat >= 1)}`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[13px] font-bold text-foreground tabular-nums">
              {streak} dagen op rij
            </h3>
            <p className="text-[11.5px] text-gray-500 dark:text-muted-foreground">
              {streak >= 7 ? 'Een week trouw gelezen.' : `Nog ${7 - streak} dagen tot een week.`}
            </p>
          </div>

          <ul className="mt-3 flex items-center gap-1.5" aria-label="Deze week">
            {weekDone.map((filled, index) => {
              const today = index === weekDone.length - 1;
              return (
                <li key={WEEKDAYS[index]} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    aria-hidden
                    className={[
                      'flex h-7 w-full items-center justify-center rounded-md border',
                      filled ? 'border-transparent' : 'border-dashed border-gray-300 dark:border-border',
                    ].join(' ')}
                    style={filled ? { backgroundColor: TEAL } : undefined}
                  >
                    {filled && <Check size={13} className="text-white" />}
                  </span>
                  <span
                    className={[
                      'text-[10px] tabular-nums',
                      today
                        ? 'font-bold text-foreground'
                        : 'text-gray-400 dark:text-muted-foreground',
                    ].join(' ')}
                  >
                    {WEEKDAYS[index]}
                  </span>
                  <span className="sr-only">
                    {WEEKDAYS[index]}: {filled ? 'gelezen' : 'niet gelezen'}
                    {today ? ' (vandaag)' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* De haak terug. One named next action, inside the close rather than
            after it - the single thing the research says the current flow is
            missing. */}
        {next && !finished ? (
          <div className={`mt-5 ${arrive(beat >= 3)}`}>
            <Link
              href={`/studie/versie-3/${studyId}/${next.day}`}
              className="press flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-white no-underline transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
              style={{ backgroundColor: TEAL }}
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/20 text-[13px] font-bold tabular-nums">
                {next.day}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-bold uppercase tracking-widest text-white/80">
                  {nextWhen} · stop {next.day}
                </span>
                <span className="block truncate text-[14.5px] font-semibold">
                  {next.title} — {next.reference}
                </span>
              </span>
              <ArrowRight size={17} className="flex-none" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className={`mt-5 ${arrive(beat >= 3)}`}>
            <Link
              href={`/studies/versie-3/${studyId}`}
              className="press flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-95"
              style={{ backgroundColor: TEAL }}
            >
              Terug naar de routekaart
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link
            href={`/studies/versie-3/${studyId}`}
            className="text-[12.5px] font-medium text-gray-500 dark:text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            De hele routekaart
          </Link>
          <Link
            href="/studies/versie-3"
            className="text-[12.5px] font-medium text-gray-500 dark:text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            Andere routes
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-gray-400 dark:text-muted-foreground">
          Ontwerpvoorbeeld. XP, reeks en voortgang op dit scherm zijn verzonnen en worden nergens
          bewaard.
        </p>
      </div>
    </div>
  );
}
