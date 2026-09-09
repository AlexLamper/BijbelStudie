import React from 'react';
import Link from 'next/link';

import { TEAL } from './typography';

/**
 * The lessons as a table of contents.
 *
 * Not a list of cards and not an accordion: a contents page. Number, title, a
 * dotted leader, the reference, the minutes - the shape every reader already
 * knows from the front of a book, which is why it needs no explaining and no
 * chrome.
 *
 * The leader is a dotted hairline that grows to fill whatever is left between
 * the title and the reference, so the right-hand column stays a true column at
 * every title length. Below `sm` it is dropped and the meta wraps onto its own
 * line, because a leader across 320px is a smear.
 *
 * Server-rendered: every row is a link, nothing here needs state.
 */

export interface ContentsLesson {
  day: number;
  title: string;
  /** "Johannes 20:1-18" */
  reference: string;
  minutes: number;
}

export default function RustContents({
  lessons,
  hrefFor,
  currentDay,
  completedDays,
}: {
  lessons: ContentsLesson[];
  hrefFor: (day: number) => string;
  /** The lesson to resume, or null when the study has not been started. */
  currentDay: number | null;
  completedDays: number[];
}) {
  const done = new Set(completedDays);

  return (
    <ol className="border-t border-border">
      {lessons.map((lesson) => {
        const isDone = done.has(lesson.day);
        const isCurrent = lesson.day === currentDay;

        return (
          <li key={lesson.day} className="border-b border-border">
            <Link
              href={hrefFor(lesson.day)}
              aria-current={isCurrent ? 'step' : undefined}
              className="group flex flex-col gap-1 py-3.5 no-underline sm:flex-row sm:items-baseline sm:gap-3"
            >
              <span
                className="w-6 flex-none text-[12px] tabular-nums text-muted-foreground sm:text-right"
                style={isCurrent ? { color: TEAL } : undefined}
              >
                {lesson.day}
              </span>

              <span
                className={[
                  'min-w-0 font-serif text-[16.5px] leading-snug decoration-1 underline-offset-[5px] group-hover:underline',
                  isDone ? 'text-muted-foreground' : 'text-foreground',
                ].join(' ')}
                style={isCurrent ? { color: TEAL } : undefined}
              >
                {lesson.title}
              </span>

              {/* The leader. Nudged up to sit on the baseline of the text
                  either side of it rather than under the descenders. */}
              <span
                aria-hidden
                className="hidden flex-1 translate-y-[-0.3em] border-b border-dotted border-border sm:block"
              />

              <span className="flex flex-none items-baseline gap-3 text-[12px] text-muted-foreground sm:gap-4">
                <span className="tabular-nums">{lesson.reference}</span>
                <span className="w-[4.5rem] tabular-nums sm:text-right">
                  {isDone ? 'afgerond' : `${lesson.minutes} min`}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
