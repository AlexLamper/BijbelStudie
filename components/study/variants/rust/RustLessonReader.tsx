'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import { STEP_LABELS } from '../../flow/StudyStepRail';
import {
  CloseStep,
  DepthStep,
  IntroStep,
  QuizStep,
  ReflectionStep,
  WordStep,
  type RustLessonPayload,
} from './RustSteps';
import { ACTION_CLASS, QUIET_LINK_CLASS, TEAL } from './typography';

/**
 * The lesson, as one column of a book.
 *
 * Three fixed bands and one scroller: a thin identity bar, the progress line,
 * the page, and the two controls that move you through it. The frame around it
 * comes from app/studie/layout.tsx - this is the window, so it owns its own
 * height and never lets the page behind it scroll.
 *
 * The progress line is deliberately the quietest thing on the screen: five
 * words in small caps and one hairline that fills up. There is no meter, no
 * percentage and no check marks. "Where am I" is answered by the filled
 * proportion and by which word is teal.
 *
 * Client because the steps are state. Everything it renders was resolved on the
 * server from authored content - no fetch here except the passage, which asks
 * the public bible endpoint for its own text.
 */
export default function RustLessonReader({
  lesson,
  detailHref,
  nextHref,
}: {
  lesson: RustLessonPayload;
  /** Back to the study's contents page. */
  detailHref: string;
  /** The next lesson, resolved on the server. Null on the last lesson. */
  nextHref: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [reflection, setReflection] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const steps = lesson.steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  // A step change is a page turn: the reader should be at the top of the new
  // page, not halfway down it because the previous one was longer.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index, closed]);

  const progress = closed ? 100 : ((index + 1) / Math.max(steps.length, 1)) * 100;

  const goTo = (next: number) => {
    setClosed(false);
    setIndex(Math.max(0, Math.min(next, steps.length - 1)));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Who and where. One line, no title bar furniture: the way out is a
          word, not an icon. */}
      <header className="flex flex-none flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b border-border px-5 py-2.5 sm:px-8">
        <p className="min-w-0 text-[12.5px] text-muted-foreground">
          <span className="truncate">{lesson.studyTitle}</span>
          <span aria-hidden> &middot; </span>
          <span className="tabular-nums">
            les {lesson.day} van {lesson.lessonsTotal}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <StudyFlowVariantSwitcher />
          <Link href={detailHref} className={QUIET_LINK_CLASS}>
            Sluiten
          </Link>
        </div>
      </header>

      {/* The progress line. */}
      <nav aria-label="Voortgang" className="flex-none px-5 pt-3 sm:px-8">
        <ol className="flex items-baseline gap-x-6 overflow-x-auto sm:gap-x-9">
          {steps.map((key, position) => {
            const isCurrent = !closed && position === index;
            const isPast = closed || position < index;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => goTo(position)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'whitespace-nowrap pb-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors',
                    isCurrent
                      ? 'font-semibold'
                      : isPast
                        ? 'text-foreground/70 hover:text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                  style={isCurrent ? { color: TEAL } : undefined}
                >
                  {STEP_LABELS[key]}
                </button>
              </li>
            );
          })}
        </ol>
        {/* One hairline across the whole window: teal up to where you are,
            grey after it. This is the entire progress display. */}
        <div className="relative h-px w-full bg-border">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 block motion-safe:transition-[width] motion-safe:duration-300"
            style={{ width: `${progress}%`, backgroundColor: TEAL }}
          />
        </div>
      </nav>

      {/* The page. */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-[74ch] px-6 py-10 sm:px-10 lg:py-14">
          {/* The chapter opening, set once above whichever step you are on -
              so the lesson always tells you what it is, the way a page of a
              book carries its own title. */}
          <header className="mb-12">
            <h1 className="font-serif text-[27px] font-normal leading-[1.2] text-foreground sm:text-[31px]">
              {lesson.title}
            </h1>
            <p className="mt-2.5 text-[12.5px] tabular-nums text-muted-foreground">
              {lesson.reference}
              <span aria-hidden> &middot; </span>
              {lesson.minutes} min
            </p>
          </header>

          {closed ? (
            <CloseStep
              lesson={lesson}
              wroteReflection={reflection.trim().length > 0}
              href={lesson.next && nextHref ? nextHref : detailHref}
              onBack={() => setClosed(false)}
            />
          ) : step === 'intro' ? (
            <IntroStep lesson={lesson} position={index + 1} />
          ) : step === 'word' ? (
            <WordStep lesson={lesson} position={index + 1} />
          ) : step === 'depth' ? (
            <DepthStep lesson={lesson} position={index + 1} />
          ) : step === 'reflection' ? (
            <ReflectionStep
              lesson={lesson}
              position={index + 1}
              value={reflection}
              onChange={setReflection}
            />
          ) : (
            <QuizStep lesson={lesson} position={index + 1} />
          )}
        </article>
      </div>

      {/* Two controls, at the two ends. Nothing in the middle: the progress
          line above already says where you are. */}
      {!closed && (
        <footer className="flex flex-none items-center justify-between gap-4 border-t border-border px-5 py-3 sm:px-8">
          {index === 0 ? (
            <Link href={detailHref} className={QUIET_LINK_CLASS}>
              Terug naar de studie
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Vorige: {STEP_LABELS[steps[index - 1]]}
            </button>
          )}

          <button
            type="button"
            onClick={() => (isLast ? setClosed(true) : goTo(index + 1))}
            className={ACTION_CLASS}
            style={{ backgroundColor: TEAL }}
          >
            {isLast ? 'Rond de les af' : `Volgende: ${STEP_LABELS[steps[index + 1]]}`}
          </button>
        </footer>
      )}
    </div>
  );
}
