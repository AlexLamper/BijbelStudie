'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';

import CommentaryComponent from '../../CommentaryComponent';
import PassageReader from '../../flow/PassageReader';
import { STEP_LABELS } from '../../flow/StudyStepRail';
import type { StudyType } from '../../../../lib/data/curated-studies';
import type { StepKey } from '../../../../lib/studyFlow';
import ReviewBar from './ReviewBar';
import StudyTint from './StudyTint';
import StudyWindow from './StudyWindow';
import {
  ON_ART,
  ON_ART_FAINT,
  ON_ART_MUTED,
  SCRIM_HERO,
  SCRIM_STRIP,
  studyArtFor,
  type StudyArt,
} from './studyHorizon';

const TEAL = '#0D9488';
const SCOPE = 'vs-lesson';

export interface DemoQuizQuestion {
  id: string;
  text: string;
  answers: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

export interface VenstersLessonProps {
  study: { id: string; type: StudyType; kind?: string; title: string; lessonsTotal: number };
  lesson: { day: number; title: string; minutes: number };
  steps: StepKey[];
  passage: {
    book: string;
    chapter: number;
    verseRange?: string;
    verseStart: number | null;
    verseEnd: number | null;
  };
  translation: string;
  translations: { id: string; name: string; language?: string }[];
  commentaryId: string;
  content: {
    intro: { headline: string; body: string[]; watchFor?: string[] } | null;
    readingCue: string | null;
    depth: { body?: string[]; terms?: { term: string; meaning: string }[] } | null;
    reflection: { question: string; prompts: string[]; placeholder: string | null };
  };
  /** Demo questions, or an empty list for the (real) "nothing here yet" state. */
  quiz: DemoQuizQuestion[];
  nextLesson: { day: number; title: string; reference: string } | null;
  /** Demo close figures. See the page file. */
  reward: { xp: number; streak: number };
}

const LANGUAGE_LABELS: Record<string, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  af: 'Afrikaans',
};

/**
 * Variant 2 - "Vensters" - screen 3 of 3: one lesson.
 *
 * You are inside the landscape now. The window that was a card in the catalogue
 * and a full band on the study page is a slim strip along the top of the
 * immersive frame, and it is the only picture on the screen: everything below
 * it is a calm ground, because the reading has to win against the art, not
 * compete with it.
 *
 * The strip moves. Each step pushes the horizon a little further left and a
 * little larger, from a pivot low and right - so advancing reads as walking
 * deeper into the same place rather than switching tabs. It is one transform on
 * one element, it composites, and reduced motion drops the transition while
 * keeping the position, so the strip still says where you are.
 *
 * The close is the loudest moment on purpose (LEARNING_UX_RESEARCH §2.2): the
 * window opens to the full frame, the figures land, and the NEXT lesson is
 * named rather than pointed at. No tree is mounted here - that is the reward
 * screen's job, and a canvas has no business being the first paint of anything.
 */
export default function VenstersLesson(props: VenstersLessonProps) {
  const { study, lesson, steps, passage, content, quiz, nextLesson, reward } = props;

  const art = useMemo(
    () => studyArtFor({ id: study.id, type: study.type, kind: study.kind }),
    [study.id, study.type, study.kind],
  );

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [done, setDone] = useState(false);
  /** `content-in` may not sit on server markup, so it only arms after a move. */
  const [moved, setMoved] = useState(false);
  const [version, setVersion] = useState(props.translation);
  const [reflection, setReflection] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  /**
   * The quiz answers live here, not in the step body: the body remounts on
   * every step change (that is what plays the arrival), and a reader who steps
   * back to re-read the passage must not lose three answered questions.
   */
  const [quizAt, setQuizAt] = useState(0);
  const [quizChosen, setQuizChosen] = useState<Record<string, string>>({});
  const [quizGraded, setQuizGraded] = useState(false);

  const index = Math.max(0, steps.indexOf(step));
  const reference =
    passage.verseStart == null
      ? `${passage.book} ${passage.chapter}`
      : passage.verseEnd && passage.verseEnd !== passage.verseStart
        ? `${passage.book} ${passage.chapter}:${passage.verseStart}-${passage.verseEnd}`
        : `${passage.book} ${passage.chapter}:${passage.verseStart}`;

  const goto = (next: StepKey) => {
    setMoved(true);
    setStep(next);
  };

  const back = () => {
    if (index > 0) goto(steps[index - 1]);
  };

  const forward = () => {
    if (index < steps.length - 1) {
      goto(steps[index + 1]);
      return;
    }
    setMoved(true);
    setDone(true);
  };

  /** The strip's walk. At the close it opens to the whole frame. */
  const walk: React.CSSProperties = {
    transform: `translateX(${-index * 2.5}%) scale(${1 + index * 0.06})`,
    transformOrigin: '62% 100%',
  };

  return (
    <div id={SCOPE} className="flex h-full flex-col bg-background">
      <StudyTint scopeId={SCOPE} palette={art.palette} />
      <div className="flex-none">
        <ReviewBar sticky={false} />
      </div>

      {done ? (
        <LessonClose
          art={art}
          study={study}
          lesson={lesson}
          reward={reward}
          nextLesson={nextLesson}
          onReopen={() => {
            setDone(false);
            setStep(steps[0]);
          }}
        />
      ) : (
        <>
          {/* ---- the strip ------------------------------------------------ */}
          <div className="relative h-[112px] flex-none overflow-hidden lg:h-[132px]">
            <StudyWindow
              art={art}
              style={walk}
              className="absolute inset-0 duration-700 ease-out motion-safe:transition-transform"
            />
            <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_STRIP }} />

            <div className="absolute inset-0 flex items-center gap-3 px-4 pb-5 sm:px-6">
              <Link
                href={`/studies/versie-2/${encodeURIComponent(study.id)}`}
                aria-label="Sluit de les en ga terug naar de studie"
                title="Sluit de les"
                className="vs-focus-art inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border no-underline transition-colors"
                style={{
                  color: ON_ART,
                  borderColor: 'rgba(255,255,255,0.32)',
                  backgroundColor: 'rgba(2,6,23,0.42)',
                }}
              >
                <X size={16} aria-hidden />
              </Link>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[10.5px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: ON_ART_FAINT }}
                >
                  {study.title} · les {lesson.day} van {study.lessonsTotal}
                </p>
                <h1 className="truncate text-[17px] font-bold leading-tight sm:text-[21px]" style={{ color: ON_ART }}>
                  {lesson.title}
                </h1>
                <p className="mt-0.5 truncate text-[11.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
                  {reference} · ± {lesson.minutes} min
                </p>
              </div>

              <p
                className="hidden flex-none text-right text-[11.5px] tabular-nums sm:block"
                style={{ color: ON_ART_MUTED }}
              >
                Stap {index + 1} van {steps.length}
                <span className="block text-[13px] font-semibold" style={{ color: ON_ART }}>
                  {STEP_LABELS[step]}
                </span>
              </p>
            </div>

            {/* The rail rides the bottom edge of the picture, white on the
                scrim rather than teal on a page - inside the window, the
                window's own contrast machinery is what has to carry it. */}
            <nav
              aria-label="Voortgang in deze les"
              className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-4 pb-2.5 sm:px-6"
            >
              {steps.map((entry, position) => {
                const reachable = position <= index;
                return (
                  <button
                    key={entry}
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && goto(entry)}
                    aria-current={entry === step ? 'step' : undefined}
                    aria-label={STEP_LABELS[entry]}
                    title={STEP_LABELS[entry]}
                    className="vs-focus-art group -my-2 min-w-0 flex-1 py-2 disabled:cursor-default"
                  >
                    <span
                      className="block h-[3px] w-full rounded-full transition-colors"
                      style={{
                        backgroundColor: reachable ? '#ffffff' : 'rgba(255,255,255,0.30)',
                      }}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ---- the reading ground --------------------------------------- */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div key={step} className={moved ? 'content-in' : undefined}>
              {step === 'intro' && content.intro && (
                <StepIntroBody intro={content.intro} lessonTitle={lesson.title} />
              )}

              {step === 'word' && (
                <section className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3 vs-edge">
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">
                        Het Woord
                      </p>
                      <h2 className="mt-1 text-[22px] font-bold text-foreground">{reference}</h2>
                    </div>
                    <label className="inline-flex items-center gap-2 text-[12px] text-gray-500 dark:text-muted-foreground">
                      <span>Vertaling</span>
                      <select
                        value={version}
                        onChange={(event) => setVersion(event.target.value)}
                        className="h-8 max-w-[180px] cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-[12.5px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
                        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                      >
                        {groupVersions(props.translations).map(([language, options]) => (
                          <optgroup key={language} label={LANGUAGE_LABELS[language] ?? 'Overige vertalingen'}>
                            {options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  </div>

                  {content.readingCue && (
                    <p className="mt-4 text-[13.5px] italic leading-relaxed text-gray-500 dark:text-muted-foreground">
                      {content.readingCue}
                    </p>
                  )}

                  {/* PassageReader fetches the chapter itself and slices the
                      lesson's verses out of it, so the passage is real text
                      here and no bible data is loaded on the server. */}
                  <div className="mt-4">
                    <PassageReader
                      book={passage.book}
                      chapter={passage.chapter}
                      version={version}
                      verseStart={passage.verseStart}
                      verseEnd={passage.verseEnd}
                    />
                  </div>
                </section>
              )}

              {step === 'depth' && (
                <section className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">Verdieping</p>
                  <h2 className="mt-1 text-[22px] font-bold text-foreground">
                    Wat staat hier eigenlijk?
                  </h2>

                  <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                      <CommentaryComponent
                        book={passage.book}
                        chapter={passage.chapter}
                        source={props.commentaryId}
                        height={1}
                      />
                    </div>

                    <aside className="min-w-0">
                      {content.depth?.body && content.depth.body.length > 0 && (
                        <div className="vs-wash vs-edge rounded-xl border p-4">
                          <h3 className="text-[12px] font-bold uppercase tracking-wider vs-ink">
                            Bij dit gedeelte
                          </h3>
                          <div className="mt-2 space-y-3">
                            {content.depth.body.map((paragraph, position) => (
                              <p key={position} className="text-[13px] leading-relaxed text-foreground/85">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {content.depth?.terms && content.depth.terms.length > 0 && (
                        <dl className="mt-4 space-y-3 border-t pt-4 vs-edge">
                          {content.depth.terms.map((term) => (
                            <div key={term.term}>
                              <dt className="text-[13px] font-semibold text-foreground">{term.term}</dt>
                              <dd className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                                {term.meaning}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {!content.depth?.body?.length && !content.depth?.terms?.length && (
                        <p className="text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                          Bij dit gedeelte is nog geen eigen toelichting geschreven. De uitleg hiernaast
                          loopt het hoofdstuk vers voor vers door.
                        </p>
                      )}
                    </aside>
                  </div>
                </section>
              )}

              {step === 'reflection' && (
                <StepReflectionBody
                  reflection={content.reflection}
                  value={reflection}
                  saved={reflectionSaved}
                  onChange={(next) => {
                    setReflection(next);
                    setReflectionSaved(false);
                  }}
                  onSave={() => setReflectionSaved(true)}
                />
              )}

              {step === 'quiz' && (
                <StepQuizBody
                  questions={quiz}
                  at={quizAt}
                  chosen={quizChosen}
                  graded={quizGraded}
                  onGoTo={setQuizAt}
                  onChoose={(questionId, answerId) =>
                    setQuizChosen((current) => ({ ...current, [questionId]: answerId }))
                  }
                  onGrade={() => setQuizGraded(true)}
                />
              )}
            </div>
          </div>

          {/* ---- the footer ----------------------------------------------- */}
          <div className="flex h-16 flex-none items-center justify-between gap-3 border-t border-gray-200 px-4 dark:border-border sm:px-6">
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className="vs-focus press inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-muted-foreground dark:hover:bg-secondary"
            >
              <ArrowLeft size={14} aria-hidden /> Vorige
            </button>

            <p className="hidden text-[12px] text-gray-400 dark:text-muted-foreground sm:block">
              {STEP_LABELS[step]} — stap {index + 1} van {steps.length}
            </p>

            <button
              type="button"
              onClick={forward}
              className="vs-primary vs-focus press inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[13px] font-semibold text-white transition-colors"
            >
              {index === steps.length - 1 ? 'Les afronden' : 'Volgende'}
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function groupVersions(
  versions: { id: string; name: string; language?: string }[],
): [string, { id: string; name: string }[]][] {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const option of versions) {
    const key = option.language ?? 'overig';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  return [...groups.entries()].sort((a, b) => (a[0] === 'nl' ? -1 : b[0] === 'nl' ? 1 : a[0].localeCompare(b[0])));
}

function StepIntroBody({
  intro,
  lessonTitle,
}: {
  intro: { headline: string; body: string[]; watchFor?: string[] };
  lessonTitle: string;
}) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-9 sm:px-10 sm:py-12">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">{lessonTitle}</p>
      <h2 className="mt-2 text-[26px] font-bold leading-snug text-foreground sm:text-[32px]">
        {intro.headline}
      </h2>
      <div className="mt-5 space-y-4">
        {intro.body.map((paragraph, index) => (
          <p key={index} className="text-[15.5px] leading-relaxed text-foreground/90">
            {paragraph}
          </p>
        ))}
      </div>

      {intro.watchFor && intro.watchFor.length > 0 && (
        <aside className="vs-wash vs-edge mt-8 rounded-xl border p-5">
          <h3 className="text-[12px] font-bold uppercase tracking-wider vs-ink">Let hier op</h3>
          <ul className="mt-3 space-y-2">
            {intro.watchFor.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground/90">
                <span aria-hidden className="vs-rule mt-2 h-1.5 w-1.5 flex-none rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}

function StepReflectionBody({
  reflection,
  value,
  saved,
  onChange,
  onSave,
}: {
  reflection: { question: string; prompts: string[]; placeholder: string | null };
  value: string;
  saved: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <article className="mx-auto max-w-2xl px-6 py-9 sm:px-10 sm:py-12">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">Reflectie</p>
      <h2 className="mt-2 text-[24px] font-bold leading-snug text-foreground sm:text-[29px]">
        {reflection.question}
      </h2>

      {reflection.prompts.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {reflection.prompts.map((prompt, index) => (
            <li
              key={index}
              className="flex gap-2.5 text-[13.5px] leading-relaxed text-gray-500 dark:text-muted-foreground"
            >
              <span aria-hidden className="vs-rule mt-2 h-1.5 w-1.5 flex-none rounded-full" />
              {prompt}
            </li>
          ))}
        </ul>
      )}

      <label htmlFor="vensters-reflectie" className="mt-7 block text-[12.5px] font-semibold text-foreground">
        Jouw antwoord
      </label>
      <textarea
        id="vensters-reflectie"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={9}
        placeholder={reflection.placeholder ?? 'Schrijf op wat je opvalt, en wat je ermee gaat doen.'}
        className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-[15px] leading-relaxed text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground" aria-live="polite">
          {words === 0 ? 'Nog niets geschreven' : `${words} ${words === 1 ? 'woord' : 'woorden'}`}
          {saved ? ' · bewaard bij je notities' : ''}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={value.trim().length === 0}
          className="vs-primary vs-focus press inline-flex h-9 items-center rounded-lg px-4 text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saved ? 'Bewaard' : 'Bewaar bij je notities'}
        </button>
      </div>
    </article>
  );
}

function StepQuizBody({
  questions,
  at,
  chosen,
  graded,
  onGoTo,
  onChoose,
  onGrade,
}: {
  questions: DemoQuizQuestion[];
  at: number;
  chosen: Record<string, string>;
  graded: boolean;
  onGoTo: (index: number) => void;
  onChoose: (questionId: string, answerId: string) => void;
  onGrade: () => void;
}) {
  if (questions.length === 0) {
    return (
      <article className="mx-auto max-w-2xl px-6 py-14 text-center sm:px-10">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">Toetsing</p>
        <h2 className="mt-2 text-[22px] font-bold text-foreground">
          Voor dit gedeelte staan nog geen vragen klaar
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          Dat hoort erbij: de vragenbank groeit per bijbelgedeelte mee. Je kunt de les gewoon
          afronden — er gaat niets verloren.
        </p>
      </article>
    );
  }

  const score = questions.filter((question) => chosen[question.id] === question.correctId).length;
  const all = questions.every((question) => chosen[question.id]);
  const question = questions[at];

  if (graded) {
    return (
      <article className="mx-auto max-w-2xl px-6 py-9 sm:px-10 sm:py-12">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">Toetsing</p>
        <h2 className="mt-2 text-[24px] font-bold text-foreground tabular-nums">
          {score} van {questions.length} goed
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
          Een fout antwoord houdt je nergens tegen. Lees na wat je miste en rond de les af.
        </p>

        <ol className="mt-6 space-y-4">
          {questions.map((entry) => {
            const picked = chosen[entry.id];
            const right = picked === entry.correctId;
            return (
              <li key={entry.id} className="rounded-xl border p-4 vs-edge">
                <p className="text-[14px] font-semibold text-foreground">{entry.text}</p>
                <p
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium"
                  style={{ color: right ? TEAL : '#dc2626' }}
                >
                  {right ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
                  {entry.answers.find((answer) => answer.id === picked)?.text ?? 'Niet beantwoord'}
                </p>
                {!right && (
                  <p className="mt-1 text-[13px] text-foreground/80">
                    Juist:{' '}
                    <span className="font-semibold">
                      {entry.answers.find((answer) => answer.id === entry.correctId)?.text}
                    </span>
                  </p>
                )}
                <p className="mt-2 text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                  {entry.explanation}
                </p>
              </li>
            );
          })}
        </ol>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-9 sm:px-10 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] vs-ink">Toetsing</p>
        <nav aria-label="Vragen" className="-mr-1.5 flex items-center">
          {questions.map((entry, position) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onGoTo(position)}
              aria-label={`Vraag ${position + 1}`}
              aria-current={position === at ? 'true' : undefined}
              className="vs-focus inline-flex h-7 w-7 items-center justify-center"
            >
              <span
                className="h-2 w-2 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    position === at
                      ? TEAL
                      : chosen[entry.id]
                        ? 'rgba(13,148,136,0.45)'
                        : 'rgba(148,163,184,0.45)',
                }}
              />
            </button>
          ))}
        </nav>
      </div>

      <h2 className="mt-3 text-[21px] font-bold leading-snug text-foreground sm:text-[25px]">
        {question.text}
      </h2>

      <ul className="mt-5 space-y-2">
        {question.answers.map((answer, position) => {
          const picked = chosen[question.id] === answer.id;
          return (
            <li key={answer.id}>
              <button
                type="button"
                onClick={() => onChoose(question.id, answer.id)}
                aria-pressed={picked}
                className={[
                  'vs-focus flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                  picked
                    ? ''
                    : 'vs-edge-hover border-gray-200 hover:bg-gray-50 dark:border-border dark:hover:bg-secondary',
                ].join(' ')}
                style={picked ? { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.08)' } : undefined}
              >
                <span
                  className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[12px] font-bold"
                  style={
                    picked
                      ? { backgroundColor: TEAL, color: '#ffffff' }
                      : { backgroundColor: 'rgba(100,116,139,0.16)' }
                  }
                >
                  {['A', 'B', 'C', 'D'][position]}
                </span>
                <span className="text-[14.5px] text-foreground">{answer.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onGoTo(Math.max(0, at - 1))}
          disabled={at === 0}
          className="vs-focus press inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-border dark:text-muted-foreground dark:hover:bg-secondary"
        >
          <ArrowLeft size={13} aria-hidden /> Vorige vraag
        </button>

        {at < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => onGoTo(at + 1)}
            disabled={!chosen[question.id]}
            className="vs-primary vs-focus press inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Volgende vraag <ArrowRight size={13} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGrade}
            disabled={!all}
            className="vs-primary vs-focus press inline-flex h-9 items-center rounded-lg px-4 text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Nakijken
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * The close.
 *
 * The one moment on this screen that is allowed to be loud: the window opens to
 * the whole frame, the two figures land on the glass, and the next lesson is
 * NAMED - the return hook belongs inside the close, not after it.
 */
function LessonClose({
  art,
  study,
  lesson,
  reward,
  nextLesson,
  onReopen,
}: {
  art: StudyArt;
  study: { id: string; title: string; lessonsTotal: number };
  lesson: { day: number; title: string };
  reward: { xp: number; streak: number };
  nextLesson: { day: number; title: string; reference: string } | null;
  onReopen: () => void;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <StudyWindow art={art} className="absolute inset-0" />
      <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_HERO }} />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-end px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em]" style={{ color: ON_ART_FAINT }}>
            Les {lesson.day} van {study.lessonsTotal} · {study.title}
          </p>
          {/* The close replaces the strip, and the strip carried the h1 - so it
              carries it here, or the screen loses its top-level heading. */}
          <h1 className="mt-2 text-[30px] font-bold leading-tight sm:text-[40px]" style={{ color: ON_ART }}>
            {lesson.title} is af.
          </h1>

          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wider" style={{ color: ON_ART_FAINT }}>
                Verdiend
              </dt>
              <dd className="mt-1 text-[30px] font-bold tabular-nums" style={{ color: ON_ART }}>
                +{reward.xp} XP
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider" style={{ color: ON_ART_FAINT }}>
                Op rij
              </dt>
              <dd className="mt-1 text-[30px] font-bold tabular-nums" style={{ color: ON_ART }}>
                {reward.streak} dagen
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-[14px] leading-relaxed" style={{ color: ON_ART_MUTED }}>
            Je boom groeide een stukje mee. Bekijk hem straks bij Voortgang.
          </p>

          <div className="mt-9 border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.22)' }}>
            {nextLesson ? (
              <>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: ON_ART_FAINT }}>
                  Hierna
                </p>
                <p className="mt-1 text-[17px] font-semibold" style={{ color: ON_ART }}>
                  Les {nextLesson.day} — {nextLesson.title}
                </p>
                <p className="text-[12.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
                  {nextLesson.reference}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/studie/versie-2/${encodeURIComponent(study.id)}/${nextLesson.day}`}
                    className="vs-focus-art press inline-flex h-11 items-center gap-2 rounded-xl px-6 text-[14px] font-semibold text-white no-underline"
                    style={{ backgroundColor: TEAL }}
                  >
                    Begin les {nextLesson.day} <ArrowRight size={15} aria-hidden />
                  </Link>
                  <Link
                    href={`/studies/versie-2/${encodeURIComponent(study.id)}`}
                    className="vs-focus-art inline-flex h-11 items-center rounded-xl border px-5 text-[13.5px] font-medium no-underline transition-colors"
                    style={{
                      color: ON_ART,
                      borderColor: 'rgba(255,255,255,0.32)',
                      backgroundColor: 'rgba(2,6,23,0.35)',
                    }}
                  >
                    Terug naar de studie
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-[17px] font-semibold" style={{ color: ON_ART }}>
                  Dit was de laatste les van deze studie.
                </p>
                <Link
                  href="/studies/versie-2"
                  className="vs-focus-art press mt-5 inline-flex h-11 items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline"
                  style={{ backgroundColor: TEAL }}
                >
                  Kies je volgende venster
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={onReopen}
              className="vs-focus-art mt-4 block text-[12.5px] underline-offset-4 hover:underline"
              style={{ color: ON_ART_MUTED }}
            >
              Deze les nog eens doorlopen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
