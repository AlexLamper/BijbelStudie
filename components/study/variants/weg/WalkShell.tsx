'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import RoadRibbon from './RoadRibbon';
import WalkClose from './WalkClose';
import { DepthBody, IntroBody, QuizBody, ReflectionBody, WordBody } from './WalkSteps';
import { TEAL, type RouteArt } from './routeArt';
import { playSwipe } from '../../../../lib/studySound';
import type { StepKey } from '../../../../lib/studyFlow';

/**
 * Ontwerp 3 - "Weg". Het lesscherm: je staat op een stop van de route.
 *
 * Same metaphor as the other two screens, one level down. The route has stops;
 * a stop has a leg you walk in five parts, and the rail across the top is that
 * leg drawn as the same road - teal behind you, sand ahead, a marker where you
 * stand. Finishing a part moves the marker, which is the only thing on the
 * screen that is allowed to move while you are reading.
 *
 * The work stays plain on purpose: no XP counter, no streak, no tree inside a
 * step. All of that is saved for the close, which is where the research puts
 * the weight.
 *
 * This is a design preview. Nothing posts, nothing is stored, and the state
 * below (which stops are behind you, the streak, the XP) is demo data handed
 * down from the page.
 */

/** The five parts of a leg, in the language of the rest of the variant. */
const LEG_LABELS: Record<StepKey, string> = {
  intro: 'Vertrek',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

export interface WalkContent {
  intro: { headline: string; body: string[]; watchFor: string[] } | null;
  readingCue: string | null;
  depth: { body: string[]; terms: { term: string; meaning: string }[] };
  reflection: { question: string; prompts: string[]; placeholder: string | null };
  quiz: { questionCount: number };
}

export interface WalkDemo {
  /** Stops behind you before this one. */
  doneBefore: number;
  xpAwarded: number;
  level: number;
  remainingXp: number;
  nextUnlock: string;
  streak: number;
  weekDone: boolean[];
  nextWhen: string;
}

export default function WalkShell({
  studyId,
  studyTitle,
  lessonsTotal,
  day,
  lessonTitle,
  minutes,
  steps,
  passage,
  reference,
  version,
  translationName,
  commentaryId,
  content,
  art,
  next,
  demo,
}: {
  studyId: string;
  studyTitle: string;
  lessonsTotal: number;
  day: number;
  lessonTitle: string;
  minutes: number;
  steps: StepKey[];
  passage: { book: string; chapter: number; verseStart: number | null; verseEnd: number | null };
  reference: string;
  version: string;
  translationName: string;
  commentaryId: string;
  content: WalkContent;
  art: RouteArt;
  next: { day: number; title: string; reference: string } | null;
  demo: WalkDemo;
}) {
  const [step, setStep] = useState<StepKey>(steps[0]);
  const [visited, setVisited] = useState<StepKey[]>([steps[0]]);
  const [finished, setFinished] = useState(false);

  const index = steps.indexOf(step);
  const position = index + 1;
  const isLast = position === steps.length;

  const goTo = useCallback(
    (target: StepKey, direction: 1 | -1) => {
      setStep(target);
      setVisited((current) => (current.includes(target) ? current : [...current, target]));
      playSwipe(direction);
    },
    [],
  );

  const forward = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    goTo(steps[index + 1], 1);
  };

  const back = () => {
    if (index > 0) goTo(steps[index - 1], -1);
  };

  /** Where you stand along today's leg, 0 to 1. */
  const legProgress = steps.length > 0 ? (index + 0.5) / steps.length : 0;

  const body = useMemo(() => {
    if (step === 'intro' && content.intro) {
      return (
        <IntroBody
          headline={content.intro.headline}
          body={content.intro.body}
          watchFor={content.intro.watchFor}
          reference={reference}
          minutes={minutes}
        />
      );
    }
    if (step === 'word') {
      return (
        <WordBody
          book={passage.book}
          chapter={passage.chapter}
          verseStart={passage.verseStart}
          verseEnd={passage.verseEnd}
          reference={reference}
          version={version}
          translationName={translationName}
          readingCue={content.readingCue}
        />
      );
    }
    if (step === 'depth') {
      return (
        <DepthBody
          book={passage.book}
          chapter={passage.chapter}
          commentaryId={commentaryId}
          body={content.depth.body}
          terms={content.depth.terms}
          reference={reference}
        />
      );
    }
    if (step === 'reflection') {
      return (
        <ReflectionBody
          question={content.reflection.question}
          prompts={content.reflection.prompts}
          placeholder={content.reflection.placeholder}
          reference={reference}
        />
      );
    }
    return <QuizBody reference={reference} questionCount={content.quiz.questionCount} />;
  }, [step, content, reference, minutes, passage, version, translationName, commentaryId]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b border-border bg-background">
        {/* Review strip. Goes away with the versie-* routes. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-dashed border-border px-3 py-1.5 sm:px-5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ontwerp 3 &middot; Weg
          </span>
          <StudyFlowVariantSwitcher />
        </div>

        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          <Link
            href={`/studies/versie-3/${studyId}`}
            aria-label="De route verlaten"
            title="De route verlaten"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted-foreground no-underline transition-colors hover:bg-gray-100 dark:hover:bg-secondary"
          >
            <X size={17} aria-hidden />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[13.5px] font-bold text-foreground">
              Stop {day} — {lessonTitle}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground tabular-nums">
              {studyTitle} &middot; stop {day} van {lessonsTotal} &middot; {reference}
            </p>
          </div>

          <p className="hidden w-24 flex-none text-right text-[11px] text-muted-foreground tabular-nums sm:block">
            {finished ? 'afgerond' : `deel ${position}/${steps.length}`}
          </p>
        </div>

        {/* De etappe van vandaag: hetzelfde stuk weg, van dichtbij. */}
        {!finished && (
          <nav aria-label="Deze stop" className="px-5 pb-3 sm:px-8">
            <div className="relative h-11">
              <div className="absolute left-0 right-0 top-[3px]">
                <RoadRibbon progress={legProgress} thickness={10} />
              </div>

              {steps.map((entry, entryIndex) => {
                const done = entryIndex < index;
                const current = entryIndex === index;
                const reachable = visited.includes(entry) || entryIndex <= index;
                const left = ((entryIndex + 0.5) / steps.length) * 100;

                return (
                  <button
                    key={entry}
                    type="button"
                    disabled={!reachable}
                    onClick={() =>
                      reachable && entry !== step && goTo(entry, entryIndex > index ? 1 : -1)
                    }
                    aria-current={current ? 'step' : undefined}
                    aria-label={`${LEG_LABELS[entry]}, deel ${entryIndex + 1} van ${steps.length}`}
                    className={[
                      'absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]',
                      reachable ? 'cursor-pointer' : 'cursor-default',
                    ].join(' ')}
                    style={{ left: `${left}%` }}
                  >
                    <span
                      aria-hidden
                      className={[
                        'flex items-center justify-center rounded-full border-2 transition-transform duration-200 ease-out motion-reduce:transition-none',
                        current ? 'h-4 w-4 scale-110' : 'h-4 w-4',
                        done || current
                          ? 'bg-white dark:bg-background'
                          : 'border-gray-300 bg-white dark:border-border dark:bg-background',
                      ].join(' ')}
                      style={
                        done
                          ? { backgroundColor: TEAL, borderColor: TEAL }
                          : current
                            ? { borderColor: TEAL }
                            : undefined
                      }
                    >
                      {done && <Check size={9} className="text-white" />}
                    </span>
                    <span
                      className={[
                        'hidden text-[10px] leading-none sm:block',
                        current
                          ? 'font-bold text-foreground'
                          : reachable
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60',
                      ].join(' ')}
                    >
                      {LEG_LABELS[entry]}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <div className="min-h-0 flex-1">
        {finished ? (
          <WalkClose
            studyId={studyId}
            studyTitle={studyTitle}
            lessonTitle={lessonTitle}
            day={day}
            lessonsTotal={lessonsTotal}
            doneBefore={demo.doneBefore}
            reference={reference}
            minutes={minutes}
            art={art}
            xpAwarded={demo.xpAwarded}
            level={demo.level}
            remainingXp={demo.remainingXp}
            nextUnlock={demo.nextUnlock}
            streak={demo.streak}
            weekDone={demo.weekDone}
            next={next}
            nextWhen={demo.nextWhen}
          />
        ) : step === 'depth' ? (
          <div key={step} className="h-full min-h-0">
            {body}
          </div>
        ) : (
          <div key={step} className="h-full min-h-0 overflow-y-auto content-in">
            {body}
          </div>
        )}
      </div>

      {!finished && (
        <footer className="flex flex-none items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            className="press inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 dark:border-border px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 dark:hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
          >
            <ArrowLeft size={14} aria-hidden />
            Vorige
          </button>

          <p className="hidden text-[11.5px] text-muted-foreground tabular-nums sm:block">
            {LEG_LABELS[step]} &middot; deel {position} van {steps.length} van deze stop
          </p>

          <button
            type="button"
            onClick={forward}
            className="press inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
            style={{ backgroundColor: TEAL }}
          >
            {isLast ? `Stop ${day} afronden` : `Verder — ${LEG_LABELS[steps[index + 1]]}`}
            <ArrowRight size={15} aria-hidden />
          </button>
        </footer>
      )}
    </div>
  );
}
