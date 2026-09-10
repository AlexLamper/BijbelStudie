'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

import type { StepKey } from '../../../../lib/studyFlow';
import { studyArtFor, type StudyArtKind } from '../../../../lib/studyArt';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import Horizon from './Horizon';
import PassageC from './PassageC';
import PlaceTint from './PlaceTint';
import ReviewStrip from './ReviewStrip';
import { ON_ART, ON_ART_FAINT, ON_ART_MUTED, SCRIM_SLIVER, TEAL, panForDay } from './place';

/**
 * Ontwerp C - "Doorlopend" - screen 3 of 3: one lesson.
 *
 * LAYOUT is ontwerp 1: a reading column with a margin beside it, and the steps
 * as a numbered margin index rather than a rail across the top. What supports
 * the text - the reading cue, the translation picker, the word list, the
 * question that is coming - stands next to the text instead of stacked under
 * it, so nothing the reader needs is ever a scroll away from what they are
 * reading.
 *
 * STYLING is ontwerp 2: the study's own palette owns the surfaces. The ground
 * under the column is the theme background with the study's colour laid over
 * it, the rules and eyebrows take that colour, and the brand teal is spent on
 * exactly one thing - the button that moves you forward.
 *
 * What "doorlopend" adds: you are INSIDE the picture now. The catalogue showed
 * this study's world whole and small, the study screen stepped in toward the
 * ridge, and here the same world is cropped to the ground you are standing on,
 * with a band of its sky left along the top edge. Same seed, same light, third
 * distance. Moving from step to step inches the window further along the ridge
 * - a transform transition, off entirely under `prefers-reduced-motion`.
 *
 * No database. The passage is fetched from /api/bible/chapter by a read-only
 * renderer; every figure on the closing plate is demo data from the page file.
 */

/** The tint scope. One per screen, so the id can be a constant. */
const SCOPE = 'pc-les';

const STEP_LABEL: Record<StepKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

const LANGUAGE_LABELS: Record<string, string> = {
  nl: 'Nederlands',
  en: 'Engels',
  de: 'Duits',
};

export interface LessonPayloadC {
  study: { id: string; type: StudyArtKind; kind?: string; title: string; lessonsTotal: number };
  lesson: { day: number; title: string; minutes: number; focus: string };
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
  content: {
    intro: { headline: string; body: string[]; watchFor?: string[] } | null;
    readingCue: string | null;
    depth: { body?: string[]; terms?: { term: string; meaning: string }[] } | null;
    reflection: { question: string; prompts: string[]; placeholder: string | null };
    quizQuestionCount: number;
  };
  /** Background on the book, for lessons without a written note of their own. */
  bookNote: {
    author: string;
    written: string;
    genre: string;
    section: { title: string; summary: string } | null;
  } | null;
  next: { day: number; title: string } | null;
}

export interface LessonDemoC {
  /** How many lessons of this study are already behind you. */
  lessonsDone: number;
  /** Days in a row, as the closing plate would report them. */
  streak: number;
  /** What was already in the reflection field. */
  note: string;
}

/** One block in the margin. A label and whatever supports the text beside it. */
function Marginal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pc-edge border-t pt-2.5">
      <p className="pc-ink text-[9.5px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <div className="mt-1.5 text-[12.5px] leading-[1.62] text-gray-600 dark:text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ position, step }: { position: number; step: StepKey }) {
  return (
    <p className="pc-ink text-[10px] font-bold uppercase tracking-[0.18em]">
      Stap {String(position).padStart(2, '0')} · {STEP_LABEL[step]}
    </p>
  );
}

export default function LessonC({ payload, demo }: { payload: LessonPayloadC; demo: LessonDemoC }) {
  const { study, lesson, steps, passage, content, bookNote, next } = payload;

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [maxReached, setMaxReached] = useState(0);
  const [version, setVersion] = useState(payload.translation);
  const [note, setNote] = useState(demo.note);
  const [ticked, setTicked] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);
  // The arrival animation must not run on server-rendered markup; it is allowed
  // in only after the reader has moved for the first time.
  const [moved, setMoved] = useState(false);

  const art = useMemo(() => studyArtFor(study.id, study.type), [study.id, study.type]);

  const index = steps.indexOf(step);
  const position = index + 1;
  const isLast = index === steps.length - 1;

  const reference = `${passage.book} ${passage.chapter}${passage.verseRange ? `:${passage.verseRange}` : ''}`;

  const translations = useMemo(() => {
    // Dutch first: the manifest mixes nl, en and de, and this is a Dutch site.
    const groups = new Map<string, { id: string; name: string; language?: string }[]>();
    for (const item of payload.translations) {
      const language = item.language ?? 'overig';
      const bucket = groups.get(language) ?? [];
      bucket.push(item);
      groups.set(language, bucket);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === 'nl') return -1;
      if (b === 'nl') return 1;
      return a.localeCompare(b, 'nl');
    });
  }, [payload.translations]);

  const versionName =
    payload.translations.find((item) => item.id === version)?.name ?? version;

  /** The self-check of the last step, out of what the intro asked you to watch. */
  const checkItems = useMemo(() => {
    if (content.intro?.watchFor && content.intro.watchFor.length > 0) return content.intro.watchFor;
    if (content.reflection.prompts.length > 0) return content.reflection.prompts;
    return [lesson.focus];
  }, [content, lesson.focus]);

  function moveTo(target: StepKey) {
    const targetIndex = steps.indexOf(target);
    if (targetIndex < 0) return;
    setMoved(true);
    setClosed(false);
    setStep(target);
    setMaxReached((value) => Math.max(value, targetIndex));
  }

  /** The margin index may go back, and to the step that is due - never further:
   *  jumping ahead to the toetsing makes the lesson pointless. */
  function goTo(target: StepKey) {
    const targetIndex = steps.indexOf(target);
    if (targetIndex < 0 || targetIndex > Math.max(maxReached, index)) return;
    moveTo(target);
  }

  function forward() {
    if (isLast) {
      setMoved(true);
      setClosed(true);
      return;
    }
    moveTo(steps[index + 1]);
  }

  function back() {
    if (closed) {
      setMoved(true);
      setClosed(false);
      return;
    }
    if (index > 0) moveTo(steps[index - 1]);
  }

  const noteWords = note.trim() ? note.trim().split(/\s+/).length : 0;

  /**
   * The walk. Every step nudges the window a little further along the ridge -
   * a transform on the picture rather than a new crop, because a viewBox cannot
   * be transitioned and a jump-cut between steps would read as a different
   * place. The 1.12 scale is what gives the translation room to move without
   * uncovering an edge.
   */
  const progress = closed ? 1 : steps.length > 1 ? index / (steps.length - 1) : 0;
  const walk: React.CSSProperties = {
    transform: `translate3d(${(-3 + progress * 6).toFixed(2)}%, 0, 0) scale(1.12)`,
  };

  return (
    <div id={SCOPE} className="pc-ground flex h-full flex-col">
      <PlaceTint scopeId={SCOPE} palette={art.palette} />

      {/* Review furniture, deliberately outside the design and off the picture:
          the switcher's text colours are theme colours and would be unreadable
          on a scrim. */}
      <div className="flex-none">
        <ReviewStrip sticky={false} />
      </div>

      {/* The sliver. The study's world, cropped to the ground you stand on -
          not a banner: at 52px it is an edge, and everything on it is either a
          control or the one line telling you where you are. */}
      <header className="relative h-[52px] flex-none sm:h-[60px]">
        <Horizon
          art={art}
          distance="binnen"
          pan={panForDay(lesson.day)}
          quiet
          artClassName="motion-safe:transition-transform motion-safe:duration-[700ms] motion-safe:ease-out"
          artStyle={walk}
          className="h-full w-full"
        />
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_SLIVER }} />

        <div className="absolute inset-0 flex items-center gap-3 px-3 sm:px-5">
          <Link
            href={`/studies/versie-c/${encodeURIComponent(study.id)}`}
            aria-label="Sluit de les en ga terug naar de studie"
            title="Sluit de les"
            className="pc-focus-art press inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border no-underline transition-colors"
            style={{
              color: ON_ART,
              borderColor: 'rgba(255,255,255,0.34)',
              backgroundColor: 'rgba(2,6,23,0.42)',
            }}
          >
            <X size={15} aria-hidden />
          </Link>

          <div className="min-w-0 flex-1">
            {/* Not a heading: the one h1 on this screen belongs to the step you
                are reading, and a heading here would invert the order. */}
            <p className="truncate text-[12.5px] font-semibold" style={{ color: ON_ART }}>
              {lesson.title}
            </p>
            <p className="truncate text-[10.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
              {study.title} · les {lesson.day} van {study.lessonsTotal} ·{' '}
              {closed ? 'afronding' : `stap ${position} van ${steps.length}`}
            </p>
          </div>

          <p
            className="hidden flex-none text-[10px] font-semibold uppercase tracking-[0.16em] lg:block"
            style={{ color: ON_ART_FAINT }}
          >
            {sceneSpec(art.scene).name}
          </p>
        </div>
      </header>

      {/* Below lg the margin index is gone, so the steps get a rail of their own
          rather than leaving the footer as the only way through. */}
      <nav
        aria-label="Stappen in deze les"
        className="pc-edge flex flex-none items-center gap-1 border-b px-3 py-2 lg:hidden"
      >
        {steps.map((entry, entryIndex) => {
          const reachable = entryIndex <= Math.max(maxReached, index);
          const current = !closed && entry === step;
          return (
            <button
              key={entry}
              type="button"
              disabled={!reachable}
              onClick={() => goTo(entry)}
              aria-current={current ? 'step' : undefined}
              className="pc-focus min-w-0 flex-1 rounded-md px-1 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={current ? { color: TEAL } : undefined}
            >
              <span className="block truncate">{STEP_LABEL[entry]}</span>
              <span
                aria-hidden
                className="mt-1 block h-[3px] w-full rounded-full"
                style={{
                  backgroundColor: current ? TEAL : reachable ? 'var(--pc-rule)' : 'var(--pc-wash)',
                }}
              />
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* The margin index: the steps as a numbered register. */}
        <nav
          aria-label="Stappen in deze les"
          className="pc-edge hidden w-[196px] flex-none flex-col border-r px-5 py-6 lg:flex"
        >
          <p className="pc-ink text-[9.5px] font-bold uppercase tracking-[0.16em]">Deze les</p>
          <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-gray-900 dark:text-foreground">
            {lesson.title}
          </p>

          <ol className="mt-5 space-y-0.5">
            {steps.map((entry, entryIndex) => {
              const current = !closed && entry === step;
              const reachable = entryIndex <= Math.max(maxReached, index);
              const done = entryIndex < index || closed;
              return (
                <li key={entry}>
                  <button
                    type="button"
                    onClick={() => goTo(entry)}
                    disabled={!reachable}
                    aria-current={current ? 'step' : undefined}
                    className={`pc-focus flex w-full items-baseline gap-2 rounded-md px-1 py-1 text-left text-[12.5px] transition-colors ${
                      reachable ? 'pc-hover' : 'cursor-not-allowed opacity-40'
                    } ${current ? 'font-semibold' : 'text-gray-500 dark:text-muted-foreground'}`}
                    style={current ? { color: TEAL } : undefined}
                  >
                    <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                      {String(entryIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate">{STEP_LABEL[entry]}</span>
                    {done && (
                      <Check
                        size={11}
                        strokeWidth={2.5}
                        aria-hidden
                        className="ml-auto flex-none"
                        style={{ color: TEAL }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
            <li>
              <span
                aria-current={closed ? 'step' : undefined}
                className="pc-edge mt-1 flex w-full items-baseline gap-2 border-t px-1 pt-2 text-[12.5px]"
                style={closed ? { color: TEAL, fontWeight: 600 } : undefined}
              >
                <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                  {String(steps.length + 1).padStart(2, '0')}
                </span>
                <span className={closed ? '' : 'text-gray-400 dark:text-muted-foreground'}>Afronding</span>
              </span>
            </li>
          </ol>

          <dl className="pc-edge mt-auto space-y-2 border-t pt-4 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-muted-foreground">Gedeelte</dt>
              <dd className="text-right tabular-nums text-gray-700 dark:text-foreground">{reference}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-muted-foreground">Tijd</dt>
              <dd className="tabular-nums text-gray-700 dark:text-foreground">± {lesson.minutes} min</dd>
            </div>
          </dl>
        </nav>

        {/* The reading column, with its margin beside it. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={closed ? 'slot' : step}
            className={`mx-auto grid w-full max-w-[1140px] gap-x-12 gap-y-8 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_248px] xl:px-12 ${moved ? 'pc-arrive' : ''}`}
          >
            {closed ? (
              <>
                <article className="min-w-0 max-w-[64ch]">
                  <p className="pc-ink text-[10px] font-bold uppercase tracking-[0.18em]">Afronding</p>
                  <h1 className="mt-2 text-[28px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[34px]">
                    Les {lesson.day} is af
                  </h1>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-foreground/85">
                    Je las {reference} en liep de les van begin tot eind door.{' '}
                    {noteWords > 0
                      ? 'Je aantekening staat hiernaast in de marge.'
                      : 'De vraag blijft staan; je kunt er later op terugkomen.'}{' '}
                    Meer hoeft er vandaag niet.
                  </p>

                  <dl className="pc-edge mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-4">
                    {[
                      { label: 'Gelezen', value: reference, teal: false },
                      { label: 'Aantekening', value: `${noteWords} woorden`, teal: false },
                      {
                        label: 'Van deze studie',
                        value: `${Math.min(demo.lessonsDone + 1, study.lessonsTotal)}/${study.lessonsTotal}`,
                        teal: false,
                      },
                      { label: 'Dagen op rij', value: String(demo.streak + 1), teal: true },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd
                          className="mt-1 text-[16px] font-semibold leading-tight tabular-nums text-gray-900 dark:text-foreground"
                          style={item.teal ? { color: TEAL } : undefined}
                        >
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    {next ? (
                      <Link
                        href={`/studie/versie-c/${encodeURIComponent(study.id)}/${next.day}`}
                        className="pc-primary pc-focus press inline-flex h-11 items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline transition-colors"
                      >
                        Les {next.day}: {next.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] text-gray-700 dark:text-foreground">
                        Dit was de laatste les van deze studie.
                      </p>
                    )}
                    <Link
                      href={`/studies/versie-c/${encodeURIComponent(study.id)}`}
                      className="pc-focus pc-hover text-[13px] text-gray-500 underline underline-offset-4 transition-colors dark:text-muted-foreground"
                    >
                      Terug naar de studie
                    </Link>
                  </div>
                </article>

                <aside className="min-w-0 space-y-6 xl:pt-1">
                  <Marginal label="Wat je opschreef">
                    {note.trim() ? (
                      <p className="whitespace-pre-line italic">{note.trim()}</p>
                    ) : (
                      <p>Je liet het veld leeg. Dat mag; de vraag blijft staan.</p>
                    )}
                  </Marginal>
                  <Marginal label="Voortgang">
                    <p>
                      Deze les telt mee voor je boom. Die groeit mee met wat je leest en afrondt.
                    </p>
                  </Marginal>
                </aside>
              </>
            ) : (
              <>
                <article className="min-w-0 max-w-[64ch]">
                  {step === 'intro' && (
                    <>
                      <Eyebrow position={position} step={step} />
                      <h1 className="mt-2 text-[28px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[33px]">
                        {content.intro?.headline ?? lesson.title}
                      </h1>
                      <div className="mt-5 space-y-5">
                        {(content.intro?.body ?? []).map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex} className="text-[16px] leading-[1.75] text-foreground/90">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  )}

                  {step === 'word' && (
                    <>
                      <Eyebrow position={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        {reference}
                      </h1>
                      <p className="mt-1.5 text-[11.5px] uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                        {versionName}
                      </p>
                      <div className="pc-edge mt-6 border-t pt-6">
                        <PassageC
                          book={passage.book}
                          chapter={passage.chapter}
                          version={version}
                          verseStart={passage.verseStart}
                          verseEnd={passage.verseEnd}
                        />
                      </div>
                    </>
                  )}

                  {step === 'depth' && (
                    <>
                      <Eyebrow position={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        Aantekening bij {reference}
                      </h1>

                      {content.depth?.body && content.depth.body.length > 0 ? (
                        <div className="mt-5 space-y-5">
                          {content.depth.body.map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex} className="text-[16px] leading-[1.75] text-foreground/90">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : bookNote?.section ? (
                        <div className="mt-5 space-y-3">
                          <p className="pc-ink text-[10.5px] font-bold uppercase tracking-[0.14em]">
                            {bookNote.section.title}
                          </p>
                          <p className="text-[16px] leading-[1.75] text-foreground/90">
                            {bookNote.section.summary}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-5 max-w-[54ch] text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                          Bij dit gedeelte is nog geen aantekening geschreven. Lees het gerust nog een
                          keer; de vraag bij de volgende stap gaat over de tekst zelf, niet over de
                          uitleg.
                        </p>
                      )}
                    </>
                  )}

                  {step === 'reflection' && (
                    <>
                      <Eyebrow position={position} step={step} />
                      <h1 className="mt-2 max-w-[26ch] text-[24px] font-bold leading-snug text-gray-900 dark:text-foreground sm:text-[28px]">
                        {content.reflection.question}
                      </h1>
                      <label
                        htmlFor="pc-reflectie"
                        className="mt-6 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground"
                      >
                        Jouw aantekening
                      </label>
                      <textarea
                        id="pc-reflectie"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={9}
                        placeholder={content.reflection.placeholder ?? 'Schrijf op wat je opviel…'}
                        className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-[15px] leading-relaxed text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
                        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                      />
                      <p className="mt-1.5 text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                        {noteWords} {noteWords === 1 ? 'woord' : 'woorden'} · wordt in dit
                        ontwerpvoorbeeld niet bewaard
                      </p>
                    </>
                  )}

                  {step === 'quiz' && (
                    <>
                      <Eyebrow position={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        Wat bleef er hangen?
                      </h1>
                      <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                        Loop na waar je op moest letten. Vink af wat je in de tekst hebt zien staan;
                        wat blijft liggen, weet je meteen waar je nog eens naar kijkt.
                      </p>
                      <ul className="pc-edge mt-6 border-t">
                        {checkItems.map((item, itemIndex) => {
                          const on = ticked.includes(itemIndex);
                          return (
                            <li key={itemIndex} className="pc-edge border-b">
                              <label className="flex cursor-pointer items-start gap-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() =>
                                    setTicked((current) =>
                                      current.includes(itemIndex)
                                        ? current.filter((value) => value !== itemIndex)
                                        : [...current, itemIndex],
                                    )
                                  }
                                  className="mt-[3px] h-4 w-4 flex-none accent-[#0D9488]"
                                />
                                <span
                                  className={`text-[15px] leading-relaxed ${
                                    on
                                      ? 'text-gray-400 line-through dark:text-muted-foreground'
                                      : 'text-gray-800 dark:text-foreground'
                                  }`}
                                >
                                  {item}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-4 text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground">
                        {ticked.length} van {checkItems.length} afgevinkt · de toets bij deze les telt{' '}
                        {content.quizQuestionCount} vragen
                      </p>
                    </>
                  )}
                </article>

                {/* The margin. What supports the text stands beside it, not under it. */}
                <aside className="min-w-0 space-y-6 xl:pt-1">
                  {step === 'intro' && content.intro?.watchFor && content.intro.watchFor.length > 0 && (
                    <Marginal label="Let hierop">
                      <ul className="space-y-2">
                        {content.intro.watchFor.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex gap-2">
                            <span aria-hidden className="flex-none font-mono text-[10px] opacity-60">
                              {String(itemIndex + 1).padStart(2, '0')}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Marginal>
                  )}

                  {step === 'word' && (
                    <>
                      {content.readingCue && (
                        <Marginal label="Leeswijzer">
                          <p className="italic">{content.readingCue}</p>
                        </Marginal>
                      )}
                      <Marginal label="Vertaling">
                        <label htmlFor="pc-vertaling" className="sr-only">
                          Kies een vertaling voor dit gedeelte
                        </label>
                        <select
                          id="pc-vertaling"
                          value={version}
                          onChange={(event) => setVersion(event.target.value)}
                          className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12.5px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
                          style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                        >
                          {translations.map(([language, options]) => (
                            <optgroup key={language} label={LANGUAGE_LABELS[language] ?? 'Overige vertalingen'}>
                              {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </Marginal>
                      <Marginal label="Straks de vraag">
                        <p className="italic">{content.reflection.question}</p>
                      </Marginal>
                    </>
                  )}

                  {step === 'depth' && (
                    <>
                      {content.depth?.terms && content.depth.terms.length > 0 && (
                        <Marginal label="Woorden">
                          <dl className="space-y-3">
                            {content.depth.terms.map((term) => (
                              <div key={term.term}>
                                <dt className="font-semibold text-gray-800 dark:text-foreground">
                                  {term.term}
                                </dt>
                                <dd className="mt-0.5">{term.meaning}</dd>
                              </div>
                            ))}
                          </dl>
                        </Marginal>
                      )}
                      {bookNote && (
                        <Marginal label="Over het boek">
                          <dl className="space-y-2">
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">Soort</dt>
                              <dd>{bookNote.genre}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">Schrijver</dt>
                              <dd>{bookNote.author}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">Geschreven</dt>
                              <dd>{bookNote.written}</dd>
                            </div>
                          </dl>
                        </Marginal>
                      )}
                      <Marginal label="Gedeelte">
                        <p className="tabular-nums">{reference}</p>
                      </Marginal>
                    </>
                  )}

                  {step === 'reflection' && (
                    <>
                      {content.reflection.prompts.length > 0 && (
                        <Marginal label="Als je vastloopt">
                          <ul className="space-y-2">
                            {content.reflection.prompts.map((prompt, promptIndex) => (
                              <li key={promptIndex}>{prompt}</li>
                            ))}
                          </ul>
                        </Marginal>
                      )}
                      <Marginal label="Gelezen">
                        <p className="tabular-nums">{reference}</p>
                      </Marginal>
                    </>
                  )}

                  {step === 'quiz' && (
                    <Marginal label="Deze les">
                      <dl className="space-y-2">
                        <div>
                          <dt className="font-semibold text-gray-800 dark:text-foreground">Gedeelte</dt>
                          <dd className="tabular-nums">{reference}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-800 dark:text-foreground">Vraag</dt>
                          <dd className="italic">{content.reflection.question}</dd>
                        </div>
                      </dl>
                    </Marginal>
                  )}
                </aside>
              </>
            )}
          </div>
        </div>
      </div>

      {/* The foot. Two directions and where you are - nothing else. */}
      <footer className="pc-edge flex-none border-t">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={back}
            disabled={!closed && index === 0}
            className="pc-focus press inline-flex h-9 items-center rounded-lg border border-gray-200 px-3.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-muted-foreground dark:hover:bg-secondary"
          >
            Vorige
          </button>

          <p className="truncate text-[11px] tabular-nums text-gray-400 dark:text-muted-foreground">
            {closed ? 'Afronding' : `${STEP_LABEL[step]} · stap ${position} van ${steps.length}`}
          </p>

          {closed ? (
            next ? (
              <Link
                href={`/studie/versie-c/${encodeURIComponent(study.id)}/${next.day}`}
                className="pc-primary pc-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Volgende les
              </Link>
            ) : (
              <Link
                href={`/studies/versie-c/${encodeURIComponent(study.id)}`}
                className="pc-primary pc-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Terug naar de studie
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={forward}
              className="pc-primary pc-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white transition-colors"
            >
              {isLast ? 'Les afronden' : 'Volgende'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
