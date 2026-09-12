'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

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
 * The lessons (design_handoff_web/PAGES-STUDIE-EN-LES.md §10).
 *
 * A card with its own tab bar, and inside it one row per lesson threaded on a
 * continuous 2 px rule at x = 32. Three states, and the design names all three:
 *
 *   afgerond    a filled `success-fill` disc with a white tick, and "Herhalen"
 *   nu          a white disc with a 2.5 px teal ring, a bold title, teal meta
 *               ending in "· nu", and "Verder"
 *   nog te doen a `line-soft` disc with a hairline, everything in `ink-faint`,
 *               and "Openen"
 *
 * The row still expands: the lesson's own focus question and the way in are
 * worth a click, and the design's action word on the right opens the lesson
 * directly, so neither affordance was lost.
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
  const [tab, setTab] = useState<'lessen' | 'over'>('lessen');

  const done = useMemo(() => new Set(completedDays), [completedDays]);
  const doneCount = lessons.filter((lesson) => done.has(lesson.day)).length;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-white"
      aria-labelledby="studie-lessen"
    >
      <div className="flex flex-none items-center gap-[22px] border-b border-line px-[21px]">
        {(
          [
            { id: 'lessen' as const, label: 'De lessen' },
            { id: 'over' as const, label: 'Over' },
          ]
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              id={item.id === 'lessen' ? 'studie-lessen' : undefined}
              className={[
                'border-b-2 pb-3 pt-[15px] text-[14px] transition-colors',
                active
                  ? 'border-teal font-semibold text-teal'
                  : 'border-transparent font-medium text-ink-muted hover:text-ink-body',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="text-[12.5px] text-ink-faint tabular-nums">
          {doneCount} van {lessons.length} afgerond
        </span>
      </div>

      {tab === 'over' ? (
        <p className="px-[18px] py-5 text-[13.5px] leading-relaxed text-ink-muted">
          Deze studie loopt van {lessons[0]?.book} {lessons[0]?.chapter} tot{' '}
          {lessons[lessons.length - 1]?.book} {lessons[lessons.length - 1]?.chapter}, in{' '}
          {lessons.length} lessen van ongeveer {lessons[0]?.minutes ?? 12} minuten.
        </p>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          {/* The thread the bullets are strung on. */}
          <span aria-hidden className="absolute bottom-0 left-8 top-0 w-[2px] bg-line" />

          <ol className="m-0 list-none p-0">
            {lessons.map((lesson) => {
              const isDone = done.has(lesson.day);
              const isCurrent = enrolled && lesson.day === currentDay;
              const isOpen = expanded === lesson.day;
              const reference = `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;
              const action = isDone ? 'Herhalen' : isCurrent ? 'Verder' : 'Openen';

              return (
                <li key={lesson.day} className="relative list-none border-t border-line-soft">
                  <div className="flex items-center gap-[14px] px-[18px] py-[11px]">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : lesson.day)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-[14px] text-left outline-none"
                    >
                      <span
                        className={[
                          'relative z-[1] flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                          isDone
                            ? 'bg-success-fill text-white'
                            : isCurrent
                              ? 'border-[2.5px] border-teal bg-white text-teal'
                              : 'border border-line bg-line-soft text-ink-faint',
                        ].join(' ')}
                      >
                        {isDone ? <Check size={13} aria-hidden strokeWidth={3} /> : lesson.day}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={[
                            'block truncate text-[14.5px]',
                            isCurrent ? 'font-bold text-ink' : isDone ? 'font-medium text-ink' : 'font-medium text-ink-faint',
                          ].join(' ')}
                        >
                          {lesson.day}. {lesson.title}
                        </span>
                        <span
                          className={[
                            'mt-[2px] block truncate text-[12px]',
                            isCurrent ? 'font-semibold text-teal' : 'text-ink-faint',
                          ].join(' ')}
                        >
                          {reference} · {lesson.minutes} min{isCurrent ? ' · nu' : ''}
                        </span>
                      </span>
                    </button>

                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/studie/${studyId}/${lesson.day}`)}
                        data-track="study_lesson_open"
                        className={[
                          'flex-none text-[12.5px] font-semibold outline-none transition-colors',
                          isDone || isCurrent ? 'text-teal hover:text-teal-dark' : 'text-ink-faint hover:text-ink-body',
                        ].join(' ')}
                      >
                        {action}
                      </button>
                    ) : (
                      <span className="inline-flex flex-none items-center gap-1.5 text-[12px] text-ink-faint">
                        <Lock size={11} aria-hidden /> Vergrendeld
                      </span>
                    )}
                  </div>

                  {/* Height-animated rather than toggled: rows below this one
                      used to jump by ~60px the instant a lesson was opened,
                      which on a forty-lesson list looks like a glitch. */}
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
                        <p className="pb-[13px] pl-[58px] pr-[18px] text-[12.5px] leading-relaxed text-ink-muted">
                          {lesson.focus}
                          {!canOpen && (
                            <span className="mt-1.5 block text-ink-faint">
                              Start de studie om deze les te openen.
                            </span>
                          )}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
