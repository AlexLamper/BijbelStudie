'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Clock, Lock, Play } from 'lucide-react';

const TEAL = '#0D9488';

export interface LessonRow {
  day: number;
  title: string;
  book: string;
  chapter: number;
  verseRange: string | null;
  focus: string;
  minutes: number;
}

/**
 * The lesson list in the right rail.
 *
 * Scrolls inside its own pane rather than lengthening the page: a book study has
 * twelve lessons, and letting the list grow pushed the title and the start
 * button off-screen. The pane keeps its own header, so "les 4 van 12" is
 * readable no matter where the list is scrolled to.
 *
 * A lesson is only openable once you are enrolled. Before that every row leads
 * to the same place as the start button, because opening a lesson without an
 * enrollment redirects straight back here - a dead end that looks like a bug.
 */
export default function LessonList({
  studyId,
  lessons,
  completedDays,
  currentDay,
  enrolled,
}: {
  studyId: string;
  lessons: LessonRow[];
  completedDays: number[];
  currentDay: number | null;
  enrolled: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(currentDay);

  const done = useMemo(() => new Set(completedDays), [completedDays]);
  const doneCount = lessons.filter((lesson) => done.has(lesson.day)).length;

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      {/* No progress bar here any more. The rail's bottom block owns progress -
          two bars for the same number, a hand apart, is one bar too many. */}
      <header className="flex-none px-4 sm:px-5 py-2.5 border-b border-gray-200 dark:border-border">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-foreground">De lessen</h2>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-muted-foreground tabular-nums">
            {doneCount} van {lessons.length} afgerond
          </span>
        </div>
      </header>

      <ol className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 py-2 space-y-1">
        {lessons.map((lesson) => {
          const isDone = done.has(lesson.day);
          const isCurrent = enrolled && lesson.day === currentDay;
          const isOpen = expanded === lesson.day;
          const reference = `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;

          return (
            <li key={lesson.day}>
              <div
                className={[
                  'rounded-xl border transition-colors',
                  isCurrent
                    ? 'bg-white dark:bg-card'
                    : 'border-transparent hover:bg-white dark:hover:bg-card',
                ].join(' ')}
                style={isCurrent ? { borderColor: TEAL } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : lesson.day)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start gap-2.5 p-2.5 text-left"
                >
                  <span
                    className={[
                      'h-6 w-6 flex-none rounded-full flex items-center justify-center text-[11px] font-bold border',
                      isDone
                        ? 'border-transparent text-white'
                        : isCurrent
                          ? 'border-transparent'
                          : 'border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground',
                    ].join(' ')}
                    style={
                      isDone
                        ? { backgroundColor: TEAL }
                        : isCurrent
                          ? { backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }
                          : undefined
                    }
                  >
                    {isDone ? <Check size={12} /> : lesson.day}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foreground truncate">
                        {lesson.title}
                      </span>
                      {isCurrent && (
                        <span
                          className="flex-none text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }}
                        >
                          Nu
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500 dark:text-muted-foreground">
                      <span className="truncate">{reference}</span>
                      <span className="inline-flex items-center gap-0.5 flex-none">
                        <Clock size={10} /> {lesson.minutes} min
                      </span>
                    </span>
                  </span>

                  <ChevronRight
                    size={14}
                    className={`flex-none mt-1 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Height-animated rather than toggled: rows below this one used
                    to jump by ~60px the instant a lesson was opened, which on a
                    twelve-lesson list looks like the page glitched. */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-2.5 pb-2.5 pl-[46px]">
                        <p className="text-[12px] text-gray-500 dark:text-muted-foreground leading-relaxed mb-2">
                          {lesson.focus}
                        </p>
                        {enrolled ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/studie/${studyId}/${lesson.day}`)}
                            data-track="study_lesson_open"
                            className="press inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: TEAL }}
                          >
                            <Play size={11} /> {isDone ? 'Opnieuw doen' : 'Open deze les'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 dark:text-muted-foreground">
                            <Lock size={11} /> Start de studie om deze les te openen
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
