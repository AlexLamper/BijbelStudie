'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Clock, Lock, Play } from 'lucide-react';
import { EYEBROW, PANEL, TEAL_DEEP, TEAL_ON_DARK } from '../../../components/scene/tokens';

/**
 * The "open this lesson" button.
 *
 * Written out rather than `CTA_BRAND` plus overrides: two Tailwind utilities
 * for the same property have equal specificity, so a `px-3` next to the token's
 * `px-5` would be settled by stylesheet order rather than by intent. Same fill
 * as CTA_BRAND - TEAL_DEEP, because white on #0D9488 is only 3.74:1 - at the
 * size a row in a list can carry.
 */
const OPEN_LESSON =
  'press inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white outline-none transition-colors hover:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-white';

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
 * The lesson list, as a panel on the scene.
 *
 * Every colour here is a literal white or black rather than a theme token: the
 * panel sits on a landscape that is the same picture in light mode and in dark
 * mode, and a token would flip underneath it.
 *
 * The list no longer scrolls inside itself. It used to be `flex-1 min-h-0
 * overflow-y-auto` inside a fixed-height pane, because the page itself never
 * scrolled; now the DOCUMENT scrolls - the scene's depth engine needs it to -
 * and the sticky column in page.tsx does the capping instead.
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
  guest = false,
}: {
  studyId: string;
  lessons: LessonRow[];
  completedDays: number[];
  currentDay: number | null;
  enrolled: boolean;
  /**
   * No session. A guest is never enrolled, but may open any lesson: the lesson
   * page renders without an account and only asks for one when it is time to
   * save. So the rows open rather than lock.
   */
  guest?: boolean;
}) {
  const router = useRouter();
  const canOpen = enrolled || guest;
  const [expanded, setExpanded] = useState<number | null>(currentDay);

  const done = useMemo(() => new Set(completedDays), [completedDays]);
  const doneCount = lessons.filter((lesson) => done.has(lesson.day)).length;

  return (
    <section className={`flex flex-col ${PANEL}`} aria-labelledby="studie-lessen">
      {/* No progress bar here. The action block in the sky owns progress - two
          bars for the same number is one bar too many. The count stays: it is
          the header of this list. */}
      <header className="flex-none border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="studie-lessen" className="text-sm font-semibold text-white">
            De lessen
          </h2>
          <span className="text-[11px] font-semibold tabular-nums text-white/65">
            {doneCount} van {lessons.length} afgerond
          </span>
        </div>
      </header>

      <ol className="m-0 list-none px-2 py-2 sm:px-3">
        {lessons.map((lesson) => {
          const isDone = done.has(lesson.day);
          const isCurrent = enrolled && lesson.day === currentDay;
          const isOpen = expanded === lesson.day;
          const reference = `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;

          return (
            <li key={lesson.day} className="list-none">
              <div
                className={[
                  'rounded-xl border transition-colors',
                  isCurrent ? 'bg-white/[0.08]' : 'border-transparent hover:bg-white/[0.06]',
                ].join(' ')}
                style={isCurrent ? { borderColor: TEAL_ON_DARK } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : lesson.day)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    className={[
                      'flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-bold tabular-nums',
                      isDone
                        ? 'border-transparent text-white'
                        : isCurrent
                          ? 'border-transparent'
                          : 'border-white/25 text-white/60',
                    ].join(' ')}
                    style={
                      isDone
                        ? { backgroundColor: TEAL_DEEP }
                        : isCurrent
                          ? { backgroundColor: 'rgba(255,255,255,0.14)', color: TEAL_ON_DARK }
                          : undefined
                    }
                  >
                    {isDone ? <Check size={12} aria-hidden /> : lesson.day}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-white">
                        {lesson.title}
                      </span>
                      {isCurrent && (
                        <span
                          className={`${EYEBROW} flex-none rounded px-1.5 py-0.5`}
                          style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: TEAL_ON_DARK }}
                        >
                          Nu
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/60">
                      <span className="truncate">{reference}</span>
                      <span className="inline-flex flex-none items-center gap-0.5 tabular-nums">
                        {/* The clock names the number as a duration; it is not
                            decoration. */}
                        <Clock size={10} aria-hidden /> {lesson.minutes} min
                      </span>
                    </span>
                  </span>

                  <ChevronRight
                    size={14}
                    aria-hidden
                    className={`mt-1 flex-none text-white/50 transition-transform ${isOpen ? 'rotate-90' : ''}`}
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
                        <p className="mb-2.5 text-[12px] leading-relaxed text-white/70">
                          {lesson.focus}
                        </p>
                        {canOpen ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/studie/${studyId}/${lesson.day}`)}
                            data-track="study_lesson_open"
                            className={OPEN_LESSON}
                            style={{ backgroundColor: TEAL_DEEP }}
                          >
                            <Play size={11} aria-hidden /> {isDone ? 'Opnieuw doen' : 'Open deze les'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-white/55">
                            <Lock size={11} aria-hidden /> Start de studie om deze les te openen
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
