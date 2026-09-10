'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

import type { StudyType } from '../../../../lib/data/curated-studies';
import { studyArtFor } from '../../../../lib/studyArt';
import type { StepKey } from '../../../../lib/studyFlow';
import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import { Horizon, ON_ART, ON_ART_FAINT, sceneName, scrimFor, StudyTint, TEAL } from './art';
import PassageColumn from './PassageColumn';

/**
 * Ontwerp B - "Dichter" - scherm 3 van 3: één les.
 *
 * De INDELING van ontwerp 1: een leeskolom met een marge ernaast, en de stappen
 * als genummerd register in die marge in plaats van als balk bovenaan. Wat de
 * tekst ondersteunt - de leeswijzer, de vertaling, de woordverklaringen, de
 * vraag die zo komt - staat náást de tekst, niet eronder gestapeld.
 *
 * De STIJL van ontwerp 2: het palet van de studie tint de bovenschriften, de
 * haarlijnen, de stapmarkering en de hover. Alleen de Schrift staat in schreef;
 * de rest is de schreefloze van de site. Het uitzicht staat één keer op het
 * scherm, klein, boven de marge-index - genoeg om te weten in welke studie je
 * zit, te weinig om met de tekst te concurreren.
 *
 * Geen database. Het gedeelte wordt door `PassageColumn` zelf opgehaald bij
 * /api/bible/chapter (alleen lezen); alle voortgang op dit scherm is verzonnen
 * demostand uit het paginabestand.
 */

const SCOPE = 'b-les';

const STEP_LABEL: Record<StepKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

export interface LessonBPayload {
  study: { id: string; type: StudyType; title: string; lessonsTotal: number };
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
  /** Achtergrond bij het boek, voor lessen zonder eigen aantekening. */
  bookNote: {
    author: string;
    written: string;
    genre: string;
    section: { title: string; summary: string } | null;
  } | null;
  next: { day: number; title: string } | null;
}

export interface LessonBDemo {
  /** Hoeveel lessen van deze studie al af zijn. */
  lessonsDone: number;
  /** Dagen op rij, zoals het slot ze zou tonen. */
  streak: number;
  /** Wat er al in het reflectieveld stond. */
  note: string;
}

/** Wat de tekst ondersteunt: in de marge, als getint paneel. */
function Marginal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="b-wash b-edge rounded-xl border p-3.5">
      <p className="b-ink text-[9.5px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <div className="mt-1.5 text-[12.5px] leading-[1.6] text-gray-600 dark:text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ index, step }: { index: number; step: StepKey }) {
  return (
    <p className="b-ink text-[10px] font-bold uppercase tracking-[0.18em]">
      Stap {String(index).padStart(2, '0')} · {STEP_LABEL[step]}
    </p>
  );
}

export default function LessonB({ payload, demo }: { payload: LessonBPayload; demo: LessonBDemo }) {
  const { study, lesson, steps, passage, content, bookNote, next } = payload;

  const art = useMemo(() => studyArtFor(study.id, study.type), [study.id, study.type]);

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [maxReached, setMaxReached] = useState(0);
  const [translation, setTranslation] = useState(payload.translation);
  const [note, setNote] = useState(demo.note);
  const [ticked, setTicked] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);
  /** `content-in` hoort niet op server-markup: pas na de eerste stapwissel. */
  const [moved, setMoved] = useState(false);

  const index = steps.indexOf(step);
  const position = index + 1;
  const isLast = index === steps.length - 1;

  const reference = `${passage.book} ${passage.chapter}${passage.verseRange ? `:${passage.verseRange}` : ''}`;

  const translations = useMemo(() => {
    // Nederlands eerst: de lijst zet nl, en en de door elkaar en dit is een
    // Nederlandstalige site.
    return [...payload.translations].sort((a, b) => {
      const aNl = a.language === 'nl' ? 0 : 1;
      const bNl = b.language === 'nl' ? 0 : 1;
      return aNl - bNl || a.name.localeCompare(b.name, 'nl');
    });
  }, [payload.translations]);

  /** De zelfcontrole van de laatste stap, uit wat de intro liet opletten. */
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

  /** De marge-index mag terug en naar de stap die aan de beurt is, nooit verder:
   *  vooruitspringen naar de toetsing maakt de les zinloos. */
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
  const studyHref = `/studies/versie-b/${encodeURIComponent(study.id)}`;

  return (
    <div id={SCOPE} className="flex h-full flex-col bg-background">
      <StudyTint scope={SCOPE} palette={art.palette} />

      {/* Kop. Eén haarlijn, drie sporen: weg hier, waar je bent, en de
          ontwerpwissel. Geen appbalk - dit scherm is een venster. */}
      <header className="b-edge flex-none border-b">
        <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
          <Link
            href={studyHref}
            aria-label="Sluit de les en ga terug naar de studie"
            title="Terug naar de studie"
            className="b-focus press inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-gray-500 no-underline transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            <X size={16} aria-hidden />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-gray-800 dark:text-foreground">
              {study.title}
            </p>
            <p className="text-[10.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
              Les {lesson.day} van {study.lessonsTotal} ·{' '}
              {closed ? 'afronding' : `stap ${position} van ${steps.length}`} · {reference}
            </p>
          </div>

          <div className="hidden flex-none md:block">
            <StudyFlowVariantSwitcher />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* De marge-index: het uitzicht klein bovenaan, dan de stappen als
            genummerd register. */}
        <nav
          aria-label="Stappen in deze les"
          className="b-edge hidden w-[204px] flex-none flex-col border-r px-4 py-4 lg:flex"
        >
          <Horizon art={art} ratio={[172, 56]} quiet className="h-[52px] w-full flex-none rounded-lg">
            <span aria-hidden className="absolute inset-0" style={{ backgroundImage: scrimFor(art, 'band') }} />
            <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5">
              <span className="block truncate text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: ON_ART_FAINT }}>
                {sceneName(art)}
              </span>
              <span className="block truncate text-[11px] font-semibold" style={{ color: ON_ART }}>
                {study.title}
              </span>
            </span>
          </Horizon>

          <p className="mt-4 text-[9.5px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground">
            Deze les
          </p>
          {/* Geen kop-element: de enige h1 van dit scherm hoort bij de stap die
              je leest, en een h2 daarvóór zou de koppenvolgorde omdraaien. */}
          <p className="mt-1 text-[14px] font-semibold leading-snug text-gray-900 dark:text-foreground">
            {lesson.title}
          </p>

          <ol className="mt-4 space-y-0.5">
            {steps.map((item, itemIndex) => {
              const current = !closed && item === step;
              const reachable = itemIndex <= Math.max(maxReached, index);
              const done = itemIndex < index || closed;
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => goTo(item)}
                    disabled={!reachable}
                    aria-current={current ? 'step' : undefined}
                    className={`b-focus flex w-full items-baseline gap-2 border-l-2 py-1 pl-2 text-left text-[12.5px] transition-colors ${
                      current ? 'b-mark b-ink font-semibold' : 'border-l-transparent'
                    } ${
                      reachable
                        ? 'hover:text-gray-900 dark:hover:text-foreground'
                        : 'cursor-not-allowed opacity-40'
                    } ${current ? '' : 'text-gray-500 dark:text-muted-foreground'}`}
                  >
                    <span className="flex-none text-[10.5px] tabular-nums opacity-70">
                      {String(itemIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate">{STEP_LABEL[item]}</span>
                    {done ? (
                      <Check
                        size={11}
                        strokeWidth={2.5}
                        aria-hidden
                        className="ml-auto flex-none"
                        style={{ color: TEAL }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li className="b-edge mt-1 border-t pt-1">
              {/* De randkleur van de tint zit op de scheidingslijn hierboven, en
                  de 2px links komt van `b-mark` - twee randregels op één element
                  zouden elkaars kleur overnemen. */}
              <span
                aria-current={closed ? 'step' : undefined}
                className={`flex w-full items-baseline gap-2 border-l-2 py-1 pl-2 text-[12.5px] ${
                  closed
                    ? 'b-mark b-ink font-semibold'
                    : 'border-l-transparent text-gray-400 dark:text-muted-foreground'
                }`}
              >
                <span className="flex-none text-[10.5px] tabular-nums opacity-70">
                  {String(steps.length + 1).padStart(2, '0')}
                </span>
                <span>Afronding</span>
              </span>
            </li>
          </ol>

          <dl className="b-edge mt-auto space-y-1.5 border-t pt-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-muted-foreground">Gedeelte</dt>
              <dd className="text-right tabular-nums text-gray-700 dark:text-foreground">{reference}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-muted-foreground">Tijd</dt>
              <dd className="tabular-nums text-gray-700 dark:text-foreground">± {lesson.minutes} min</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-muted-foreground">Van de studie</dt>
              <dd className="tabular-nums text-gray-700 dark:text-foreground">
                {demo.lessonsDone}/{study.lessonsTotal}
              </dd>
            </div>
          </dl>
        </nav>

        {/* De leeskolom met de marge ernaast. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={closed ? 'slot' : step}
            className={`mx-auto grid w-full max-w-[1140px] gap-x-10 gap-y-7 px-4 py-6 sm:px-7 xl:grid-cols-[minmax(0,1fr)_248px] xl:px-10 ${moved ? 'content-in' : ''}`}
          >
            {closed ? (
              /* Het slot. Een colofon, geen feest: wat je deed, waar je staat,
                 en de volgende les bij naam. */
              <>
                <article className="min-w-0 max-w-[64ch]">
                  <p className="b-ink text-[10px] font-bold uppercase tracking-[0.18em]">Afronding</p>
                  <h1 className="mt-2 text-[27px] font-bold leading-[1.14] text-gray-900 dark:text-foreground">
                    Les {lesson.day} is af
                  </h1>
                  <p className="mt-3 text-[15.5px] leading-[1.7] text-gray-700 dark:text-foreground/85">
                    Je las {reference} en liep de les van begin tot eind door.{' '}
                    {noteWords > 0
                      ? 'Je aantekening staat hiernaast in de marge.'
                      : 'De vraag blijft staan; je kunt er later op terugkomen.'}{' '}
                    Meer hoeft er vandaag niet.
                  </p>

                  <dl className="b-edge mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-4">
                    {[
                      { label: 'Gelezen', value: reference },
                      { label: 'Aantekening', value: `${noteWords} woorden` },
                      { label: 'Van deze studie', value: `${demo.lessonsDone + 1}/${study.lessonsTotal}` },
                      { label: 'Dagen op rij', value: String(demo.streak + 1) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd
                          className="mt-1 text-[16px] font-semibold leading-tight tabular-nums text-gray-900 dark:text-foreground"
                          style={item.label === 'Dagen op rij' ? { color: TEAL } : undefined}
                        >
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    {next ? (
                      <Link
                        href={`/studie/versie-b/${encodeURIComponent(study.id)}/${next.day}`}
                        className="b-primary b-focus press inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold text-white no-underline transition-colors"
                      >
                        Les {next.day}: {next.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] text-gray-700 dark:text-foreground">
                        Dit was de laatste les van deze studie.
                      </p>
                    )}
                    <Link
                      href={studyHref}
                      className="b-focus text-[13px] text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      Terug naar de studie
                    </Link>
                  </div>
                </article>

                <aside className="min-w-0 space-y-4 xl:pt-1">
                  <Marginal label="Wat je opschreef">
                    {note.trim() ? (
                      <p className="whitespace-pre-line italic">{note.trim()}</p>
                    ) : (
                      <p>Je liet het veld leeg. Dat mag; de vraag blijft staan.</p>
                    )}
                  </Marginal>
                  <Marginal label="Voortgang">
                    <p>Deze les telt mee voor je boom. Die groeit mee met wat je leest en afrondt.</p>
                  </Marginal>
                </aside>
              </>
            ) : (
              <>
                <article className="min-w-0 max-w-[64ch]">
                  {step === 'intro' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[27px] font-bold leading-[1.14] text-gray-900 dark:text-foreground">
                        {content.intro?.headline ?? lesson.title}
                      </h1>
                      <div className="mt-4 space-y-4">
                        {(content.intro?.body ?? []).map((paragraph, paragraphIndex) => (
                          <p
                            key={paragraphIndex}
                            className="text-[15.5px] leading-[1.72] text-gray-800 dark:text-foreground/90"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {step === 'word' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-[1.14] text-gray-900 dark:text-foreground">
                        {reference}
                      </h1>
                      <p className="mt-1 text-[11.5px] uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                        {translations.find((item) => item.id === translation)?.name ?? translation}
                      </p>
                      <div className="b-edge mt-5 border-t pt-5">
                        <PassageColumn
                          book={passage.book}
                          chapter={passage.chapter}
                          version={translation}
                          verseStart={passage.verseStart}
                          verseEnd={passage.verseEnd}
                        />
                      </div>
                    </>
                  ) : null}

                  {step === 'depth' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-[1.14] text-gray-900 dark:text-foreground">
                        Aantekening bij {reference}
                      </h1>

                      {content.depth?.body && content.depth.body.length > 0 ? (
                        <div className="mt-4 space-y-4">
                          {content.depth.body.map((paragraph, paragraphIndex) => (
                            <p
                              key={paragraphIndex}
                              className="text-[15.5px] leading-[1.72] text-gray-800 dark:text-foreground/90"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : bookNote?.section ? (
                        <div className="mt-4 space-y-3">
                          <p className="b-ink text-[11px] font-bold uppercase tracking-[0.14em]">
                            {bookNote.section.title}
                          </p>
                          <p className="text-[15.5px] leading-[1.72] text-gray-800 dark:text-foreground/90">
                            {bookNote.section.summary}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 max-w-[54ch] text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                          Bij dit gedeelte is nog geen aantekening geschreven. Lees het gerust nog een
                          keer; de vraag bij de volgende stap gaat over de tekst zelf, niet over de
                          uitleg.
                        </p>
                      )}
                    </>
                  ) : null}

                  {step === 'reflection' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 max-w-[26ch] text-[24px] font-bold leading-[1.26] text-gray-900 dark:text-foreground">
                        {content.reflection.question}
                      </h1>
                      <label
                        htmlFor="b-reflectie"
                        className="mt-5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground"
                      >
                        Jouw aantekening
                      </label>
                      <textarea
                        id="b-reflectie"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={9}
                        placeholder={content.reflection.placeholder ?? 'Schrijf op wat je opviel…'}
                        className="b-edge mt-1.5 w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] leading-[1.7] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/45 dark:bg-background dark:text-foreground"
                      />
                      <p className="mt-1.5 text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                        {noteWords} {noteWords === 1 ? 'woord' : 'woorden'} · wordt in dit
                        ontwerpvoorbeeld niet bewaard
                      </p>
                    </>
                  ) : null}

                  {step === 'quiz' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-[1.14] text-gray-900 dark:text-foreground">
                        Wat bleef er hangen?
                      </h1>
                      <p className="mt-2.5 max-w-[58ch] text-[14px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                        Loop na waar je op moest letten. Vink af wat je in de tekst hebt zien staan;
                        wat blijft liggen, weet je meteen waar je nog eens naar kijkt.
                      </p>
                      <ul className="b-edge mt-5 border-t">
                        {checkItems.map((item, itemIndex) => {
                          const on = ticked.includes(itemIndex);
                          return (
                            <li key={itemIndex} className="b-edge border-b">
                              <label className="flex cursor-pointer items-start gap-3 py-2.5">
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
                                  className={`text-[14.5px] leading-relaxed ${on ? 'text-gray-400 line-through dark:text-muted-foreground' : 'text-gray-800 dark:text-foreground'}`}
                                >
                                  {item}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-3 text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground">
                        {ticked.length} van {checkItems.length} afgevinkt · de toets bij deze les telt{' '}
                        {content.quizQuestionCount} vragen
                      </p>
                    </>
                  ) : null}
                </article>

                {/* De marge. Wat de tekst ondersteunt staat ernaast, niet eronder. */}
                <aside className="min-w-0 space-y-4 xl:pt-1">
                  {step === 'intro' && content.intro?.watchFor && content.intro.watchFor.length > 0 ? (
                    <Marginal label="Let hierop">
                      <ul className="space-y-2">
                        {content.intro.watchFor.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex gap-2">
                            <span aria-hidden className="flex-none text-[10px] tabular-nums opacity-60">
                              {String(itemIndex + 1).padStart(2, '0')}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Marginal>
                  ) : null}

                  {step === 'word' ? (
                    <>
                      {content.readingCue ? (
                        <Marginal label="Leeswijzer">
                          <p className="italic">{content.readingCue}</p>
                        </Marginal>
                      ) : null}
                      <Marginal label="Vertaling">
                        <label htmlFor="b-vertaling" className="sr-only">
                          Kies een vertaling voor dit gedeelte
                        </label>
                        <select
                          id="b-vertaling"
                          value={translation}
                          onChange={(event) => setTranslation(event.target.value)}
                          className="b-edge w-full cursor-pointer rounded-lg border bg-white px-2 py-1.5 text-[12.5px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/45 dark:bg-background dark:text-foreground"
                        >
                          {translations.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Marginal>
                      <Marginal label="Straks de vraag">
                        <p className="italic">{content.reflection.question}</p>
                      </Marginal>
                    </>
                  ) : null}

                  {step === 'depth' ? (
                    <>
                      {content.depth?.terms && content.depth.terms.length > 0 ? (
                        <Marginal label="Woorden">
                          <dl className="space-y-2.5">
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
                      ) : null}
                      {bookNote ? (
                        <Marginal label="Over het boek">
                          <dl className="space-y-1.5">
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">Soort</dt>
                              <dd>{bookNote.genre}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">
                                Schrijver
                              </dt>
                              <dd>{bookNote.author}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-800 dark:text-foreground">
                                Geschreven
                              </dt>
                              <dd>{bookNote.written}</dd>
                            </div>
                          </dl>
                        </Marginal>
                      ) : null}
                      <Marginal label="Gedeelte">
                        <p className="tabular-nums">{reference}</p>
                      </Marginal>
                    </>
                  ) : null}

                  {step === 'reflection' ? (
                    <>
                      {content.reflection.prompts.length > 0 ? (
                        <Marginal label="Als je vastloopt">
                          <ul className="space-y-2">
                            {content.reflection.prompts.map((prompt, promptIndex) => (
                              <li key={promptIndex}>{prompt}</li>
                            ))}
                          </ul>
                        </Marginal>
                      ) : null}
                      <Marginal label="Gelezen">
                        <p className="tabular-nums">{reference}</p>
                      </Marginal>
                    </>
                  ) : null}

                  {step === 'quiz' ? (
                    <Marginal label="Deze les">
                      <dl className="space-y-1.5">
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
                  ) : null}
                </aside>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Voet. Twee richtingen en waar je bent - verder niets. */}
      <footer className="b-edge flex-none border-t">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={back}
            disabled={!closed && index === 0}
            className="b-focus press inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-900/5 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            Vorige
          </button>

          <p className="min-w-0 truncate text-[11px] tabular-nums text-gray-400 dark:text-muted-foreground">
            {closed ? 'Afronding' : `${STEP_LABEL[step]} · stap ${position} van ${steps.length}`}
          </p>

          {closed ? (
            next ? (
              <Link
                href={`/studie/versie-b/${encodeURIComponent(study.id)}/${next.day}`}
                className="b-primary b-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Volgende les
              </Link>
            ) : (
              <Link
                href={studyHref}
                className="b-primary b-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Terug naar de studie
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={forward}
              className="b-primary b-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white transition-colors"
            >
              {isLast ? 'Les afronden' : 'Volgende'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
