import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

import type { StudyArt } from '../../../../lib/studyArt';
import Horizon from './Horizon';
import { ON_ART, ON_ART_MUTED, SCRIM_CARD, TEAL, panForDay } from './place';

export interface IndexLesson {
  day: number;
  title: string;
  /** "Johannes 20:1-18" - the thing the window is a window onto. */
  reference: string;
  minutes: number;
  focus: string;
}

/**
 * The lessons: the near stretch of the walk, then the register.
 *
 * Ontwerp 2 gave every lesson a freshly drawn silhouette, which made twelve
 * pictures of twelve places. Here every lesson is the SAME world seen from one
 * step further along it - `panForDay` slides the window across the ridge - so
 * the column reads as a route through one landscape, which is exactly what a
 * study is.
 *
 * No client state. A whole-book study is 150 lessons, and neither an accordion
 * nor 150 pictures is the right answer: the stretch you are actually walking is
 * drawn, and the rest is a numbered register behind a `<details>`, which needs
 * no JavaScript and is keyboard-operable for free.
 */
export default function LessonIndexC({
  studyId,
  art,
  lessons,
  completedDays,
  currentDay,
  enrolled,
}: {
  studyId: string;
  art: StudyArt;
  lessons: IndexLesson[];
  completedDays: number[];
  currentDay: number | null;
  enrolled: boolean;
}) {
  const done = new Set(completedDays);
  const doneCount = lessons.filter((lesson) => done.has(lesson.day)).length;

  const currentIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.day === currentDay),
  );
  const from = Math.max(0, Math.min(currentIndex - 1, Math.max(0, lessons.length - 8)));
  const drawn = lessons.slice(from, from + 8);
  const drawnDays = new Set(drawn.map((lesson) => lesson.day));
  const rest = lessons.filter((lesson) => !drawnDays.has(lesson.day));

  const lessonHref = (day: number) => `/studie/versie-c/${encodeURIComponent(studyId)}/${day}`;

  return (
    <section aria-labelledby="pc-lessen">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2 pc-edge">
        <h2 id="pc-lessen" className="text-[17px] font-bold text-gray-900 dark:text-foreground">
          De lessen
        </h2>
        <p className="text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground">
          {doneCount} van {lessons.length} afgerond
        </p>
      </div>

      {lessons.length === 0 ? (
        <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          Deze studie heeft nog geen lessen. Zodra ze klaarstaan, verschijnen ze hier.
        </p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {drawn.map((lesson) => {
            const isDone = done.has(lesson.day);
            const isCurrent = lesson.day === currentDay;

            const body = (
              <>
                <Horizon
                  art={art}
                  distance="pad"
                  pan={panForDay(lesson.day)}
                  quiet
                  artClassName="motion-safe:transition-transform motion-safe:duration-[600ms] motion-safe:ease-out group-hover:scale-[1.06]"
                  className={`aspect-[16/10] w-[108px] flex-none rounded-lg ${isDone ? 'opacity-70' : ''}`}
                >
                  <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
                  <span
                    className="absolute inset-x-0 bottom-0 truncate px-2 pb-1.5 text-[10px] font-semibold tabular-nums"
                    style={{ color: ON_ART_MUTED }}
                  >
                    {lesson.reference}
                  </span>
                  {isDone && (
                    <span
                      className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: TEAL, color: ON_ART }}
                    >
                      <Check size={11} aria-hidden />
                      <span className="sr-only">Afgerond</span>
                    </span>
                  )}
                </Horizon>

                <span className="min-w-0 flex-1 py-0.5">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-[14px] font-semibold text-gray-900 dark:text-foreground">
                      {lesson.day}. {lesson.title}
                    </span>
                    {isCurrent && (
                      <span className="pc-wash-strong pc-ink flex-none rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                        Nu
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                    ± {lesson.minutes} min
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                    {lesson.focus}
                  </span>
                  {!enrolled && (
                    <span className="mt-1.5 block text-[11.5px] text-gray-400 dark:text-muted-foreground">
                      Start de studie om deze les te openen
                    </span>
                  )}
                </span>
              </>
            );

            const shell = `group flex items-start gap-3 rounded-xl border p-2.5 transition-colors ${
              isCurrent ? 'pc-wash pc-edge' : 'border-transparent'
            }`;

            return (
              <li key={lesson.day}>
                {enrolled ? (
                  <Link
                    href={lessonHref(lesson.day)}
                    data-track="study_lesson_open"
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`${shell} pc-focus pc-edge-hover pc-row no-underline`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={shell}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {rest.length > 0 && (
        <details className="pc-edge mt-3 rounded-xl border">
          <summary className="pc-focus cursor-pointer select-none px-4 py-2.5 text-[13px] font-semibold text-gray-700 dark:text-foreground">
            Alle {lessons.length} lessen tonen
          </summary>
          <ol className="pc-edge border-t px-2 py-1.5">
            {rest.map((lesson) => {
              const row = (
                <>
                  <span className="w-8 flex-none font-mono text-[11px] tabular-nums text-gray-400 dark:text-muted-foreground">
                    {String(lesson.day).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                  <span className="flex-none text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                    {lesson.reference}
                  </span>
                </>
              );

              return (
                <li key={lesson.day}>
                  {enrolled ? (
                    <Link
                      href={lessonHref(lesson.day)}
                      className="pc-focus pc-row flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-[13px] text-gray-700 no-underline transition-colors dark:text-foreground"
                    >
                      {row}
                    </Link>
                  ) : (
                    <span className="flex items-baseline gap-3 px-2 py-1.5 text-[13px] text-gray-400 dark:text-muted-foreground">
                      {row}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </section>
  );
}
