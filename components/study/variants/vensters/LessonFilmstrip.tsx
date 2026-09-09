import React from 'react';
import Link from 'next/link';
import { Check, Clock, Lock } from 'lucide-react';

import StudyWindow from './StudyWindow';
import { ON_ART, ON_ART_MUTED, SCRIM_CARD, lessonArtFor, type StudyArt } from './studyHorizon';

const TEAL = '#0D9488';

export interface FilmstripLesson {
  day: number;
  title: string;
  /** "Johannes 20:1–18" - the thing the window is a window onto. */
  reference: string;
  minutes: number;
  focus: string;
}

/**
 * The lessons, as a strip of small windows.
 *
 * Every lesson keeps the study's palette and scene and redraws only the
 * silhouette (`lessonArtFor`), so the column reads as one landscape seen from
 * twelve points along a walk rather than twelve unrelated pictures - which is
 * what the whole variant is arguing: the flow is a walk from one window into
 * the next.
 *
 * Each window carries its own passage reference on the glass. That is the one
 * fact a reader scans this list for, and printing it in the picture rather than
 * beside it is what keeps the row from becoming a thumbnail plus a caption.
 *
 * No client state: a whole-book study is 150 lessons, and neither an accordion
 * nor 150 pictures is the right answer. The near stretch of the walk is drawn;
 * the rest is an index behind a `<details>`, which needs no JavaScript and is
 * keyboard-operable for free.
 */
export default function LessonFilmstrip({
  studyId,
  art,
  lessons,
  completedDays,
  currentDay,
  enrolled,
}: {
  studyId: string;
  art: StudyArt;
  lessons: FilmstripLesson[];
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
  const from = Math.max(0, Math.min(currentIndex - 2, Math.max(0, lessons.length - 12)));
  const drawn = lessons.slice(from, from + 12);
  const rest = lessons.filter((lesson) => !drawn.includes(lesson));

  return (
    <section aria-labelledby="vensters-lessen">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2 vs-edge">
        <h2 id="vensters-lessen" className="text-[17px] font-bold text-gray-900 dark:text-foreground">
          De lessen
        </h2>
        <p className="text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground">
          {doneCount} van {lessons.length} afgerond
        </p>
      </div>

      <ol className="mt-3 space-y-2">
        {drawn.map((lesson) => (
          <li key={lesson.day}>
            <LessonRow
              studyId={studyId}
              art={art}
              lesson={lesson}
              done={done.has(lesson.day)}
              current={lesson.day === currentDay}
              enrolled={enrolled}
            />
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <details className="mt-3 rounded-xl border vs-edge">
          <summary className="vs-focus cursor-pointer select-none px-4 py-2.5 text-[13px] font-semibold text-gray-700 dark:text-foreground">
            Alle {lessons.length} lessen tonen
          </summary>
          <ol className="border-t vs-edge px-2 py-1.5">
            {rest.map((lesson) => (
              <li key={lesson.day}>
                {enrolled ? (
                  <Link
                    href={`/studie/versie-2/${encodeURIComponent(studyId)}/${lesson.day}`}
                    className="vs-hover vs-focus flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-[13px] no-underline text-gray-700 transition-colors dark:text-foreground"
                  >
                    <span className="w-6 flex-none tabular-nums text-[11.5px] text-gray-400 dark:text-muted-foreground">
                      {lesson.day}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className="flex-none text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                      {lesson.reference}
                    </span>
                  </Link>
                ) : (
                  <span className="flex items-baseline gap-3 px-2 py-1.5 text-[13px] text-gray-400 dark:text-muted-foreground">
                    <span className="w-6 flex-none tabular-nums text-[11.5px]">{lesson.day}</span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className="flex-none text-[11.5px] tabular-nums">{lesson.reference}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function LessonRow({
  studyId,
  art,
  lesson,
  done,
  current,
  enrolled,
}: {
  studyId: string;
  art: StudyArt;
  lesson: FilmstripLesson;
  done: boolean;
  current: boolean;
  enrolled: boolean;
}) {
  const lessonArt = lessonArtFor(art, lesson.day);

  const body = (
    <>
      <StudyWindow
        art={lessonArt}
        quiet
        className={[
          'w-[122px] flex-none rounded-lg aspect-[16/10] transition-transform duration-300',
          enrolled ? 'group-hover:scale-[1.03]' : '',
          done ? 'opacity-70' : '',
        ].join(' ')}
      >
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_CARD }} />
        <span
          className="absolute inset-x-0 bottom-0 truncate px-2 pb-1.5 text-[10.5px] font-semibold tabular-nums"
          style={{ color: ON_ART_MUTED }}
        >
          {lesson.reference}
        </span>
        {done && (
          <span
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: TEAL, color: ON_ART }}
          >
            <Check size={11} aria-hidden />
            <span className="sr-only">Afgerond</span>
          </span>
        )}
      </StudyWindow>

      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[14px] font-semibold text-gray-900 dark:text-foreground">
            {lesson.day}. {lesson.title}
          </span>
          {current && (
            <span
              className="vs-wash vs-ink flex-none rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
            >
              Nu
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-gray-400 dark:text-muted-foreground">
          <Clock size={11} aria-hidden className="flex-none" />
          <span className="tabular-nums">{lesson.minutes} min</span>
        </span>
        <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          {lesson.focus}
        </span>
        {!enrolled && (
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-gray-400 dark:text-muted-foreground">
            <Lock size={11} aria-hidden /> Start de studie om deze les te openen
          </span>
        )}
      </span>
    </>
  );

  const shell = [
    'group flex items-start gap-3 rounded-xl border p-2.5 transition-colors',
    current ? 'vs-wash vs-edge' : 'border-transparent',
  ].join(' ');

  if (!enrolled) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={`/studie/versie-2/${encodeURIComponent(studyId)}/${lesson.day}`}
      data-track="study_lesson_open"
      aria-current={current ? 'step' : undefined}
      className={`${shell} vs-focus vs-edge-hover no-underline hover:bg-gray-50 dark:hover:bg-secondary/60`}
    >
      {body}
    </Link>
  );
}
