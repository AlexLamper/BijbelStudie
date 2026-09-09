'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

import PassageReader from '../../flow/PassageReader';
import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import type { StepKey } from '../../../../lib/studyFlow';
import type { ReadingPreferences } from '../../../../hooks/useReadingPreferences';

const TEAL = '#0D9488';

/**
 * Ontwerp 1 - Atlas. De les als leeskolom met marge.
 *
 * De staprail is een smalle marge-index geworden; de leeswijzer, de vraag, de
 * woordverklaringen en de aantekening staan naast de tekst in plaats van
 * eronder gestapeld. Schriftgedeelte in schreef. Geen beweging behalve de
 * stapwissel, en die is een fade van 220ms - de les is werk, en werk hoort
 * visueel stil te zijn (LEARNING_UX_RESEARCH.md 2.2).
 *
 * Het slot is een eigen plaat, geen stap: het afsluiten van een eenheid werk is
 * het moment dat gewicht draagt, en de volgende les wordt daar bij naam
 * genoemd.
 *
 * Geen database. De tekst haalt PassageReader zelf op bij /api/bible/chapter;
 * alle voortgang op dit scherm is verzonnen demostand uit de pagina.
 */

const STEP_LABEL: Record<StepKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

/** Vast in dit ontwerp: schreef voor de Schrift, verzen genummerd. */
const READING: ReadingPreferences = {
  fontSize: 'base',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  letterSpacing: 'normal',
  highContrast: false,
  showVerseNumbers: true,
};

export interface AtlasLessonPayload {
  study: { id: string; title: string; lessonsTotal: number };
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

export interface AtlasLessonDemo {
  /** Hoeveel lessen van deze studie al af zijn. */
  lessonsDone: number;
  /** Dagen op rij, zoals het slot ze zou tonen. */
  streak: number;
  /** Wat er al in het reflectieveld stond. */
  note: string;
}

function Marginal({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-slate-300 pt-2 dark:border-border ${className}`}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-[12.5px] leading-[1.6] text-slate-600 dark:text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ index, step }: { index: number; step: StepKey }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
      Stap {String(index).padStart(2, '0')} · {STEP_LABEL[step]}
    </p>
  );
}

export default function AtlasLesson({
  payload,
  demo,
}: {
  payload: AtlasLessonPayload;
  demo: AtlasLessonDemo;
}) {
  const { study, lesson, steps, passage, content, bookNote, next } = payload;

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [maxReached, setMaxReached] = useState(0);
  const [translation, setTranslation] = useState(payload.translation);
  const [note, setNote] = useState(demo.note);
  const [ticked, setTicked] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);
  // `content-in` hoort niet op server-gerenderde markup; pas na de eerste
  // stapwissel mag de fade meedoen.
  const [moved, setMoved] = useState(false);

  const index = steps.indexOf(step);
  const position = index + 1;
  const isLast = index === steps.length - 1;

  const reference = `${passage.book} ${passage.chapter}${passage.verseRange ? `:${passage.verseRange}` : ''}`;

  const translations = useMemo(() => {
    // Nederlands eerst: de handleiding zet nl, en en de door elkaar en dit is
    // een Nederlandstalige site.
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

  return (
    <div className="flex h-full flex-col bg-[#FAF8F4] dark:bg-background">
      {/* Kop. Eén haarlijn, drie sporen: weg hier, waar je bent, en de
          ontwerpwissel. Geen appbalk - dit scherm is een venster. */}
      <header className="flex-none border-b border-slate-200 dark:border-border">
        <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
          <Link
            href={`/studies/versie-1/${study.id}`}
            aria-label="Terug naar de studie"
            title="Terug naar de studie"
            className="press inline-flex h-8 w-8 flex-none items-center justify-center rounded-[3px] text-slate-500 no-underline transition-colors hover:bg-slate-900/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            <X size={16} />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-slate-800 dark:text-foreground">
              {study.title}
            </p>
            <p className="text-[10.5px] tabular-nums text-slate-500 dark:text-muted-foreground">
              Les {lesson.day} van {study.lessonsTotal} · {closed ? 'afronding' : `stap ${position} van ${steps.length}`}
            </p>
          </div>

          <div className="hidden flex-none md:block">
            <StudyFlowVariantSwitcher />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* De marge-index: de stappen als genummerd register. */}
        <nav
          aria-label="Stappen in deze les"
          className="hidden w-[186px] flex-none flex-col border-r border-slate-200 px-5 py-6 lg:flex dark:border-border"
        >
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
            Deze les
          </p>
          {/* Geen kop-element: de enige h1 van dit scherm hoort bij de stap die
              je leest, en een h2 dáárvoor zou de koppenvolgorde omdraaien. */}
          <p className="mt-1.5 font-serif text-[15px] leading-snug text-slate-900 dark:text-foreground">
            {lesson.title}
          </p>

          <ol className="mt-5 space-y-0.5">
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
                    className={`flex w-full items-baseline gap-2 rounded-[3px] py-1 text-left text-[12.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 ${
                      reachable
                        ? 'hover:text-slate-900 dark:hover:text-foreground'
                        : 'cursor-not-allowed opacity-40'
                    } ${current ? '' : 'text-slate-500 dark:text-muted-foreground'}`}
                    style={current ? { color: TEAL, fontWeight: 600 } : undefined}
                  >
                    <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                      {String(itemIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate">{STEP_LABEL[item]}</span>
                    {done ? (
                      <Check size={11} strokeWidth={2.5} className="ml-auto flex-none" style={{ color: TEAL }} aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li>
              <span
                aria-current={closed ? 'step' : undefined}
                className="flex w-full items-baseline gap-2 border-t border-slate-200 pt-2 text-[12.5px] dark:border-border"
                style={closed ? { color: TEAL, fontWeight: 600 } : { color: 'inherit' }}
              >
                <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                  {String(steps.length + 1).padStart(2, '0')}
                </span>
                <span className={closed ? '' : 'text-slate-400 dark:text-muted-foreground'}>Afronding</span>
              </span>
            </li>
          </ol>

          <dl className="mt-auto space-y-2 border-t border-slate-200 pt-4 text-[11px] dark:border-border">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-muted-foreground">Gedeelte</dt>
              <dd className="text-right tabular-nums text-slate-700 dark:text-foreground">{reference}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-muted-foreground">Tijd</dt>
              <dd className="tabular-nums text-slate-700 dark:text-foreground">± {lesson.minutes} min</dd>
            </div>
          </dl>
        </nav>

        {/* De leeskolom met marge ernaast. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={closed ? 'slot' : step}
            className={`mx-auto grid w-full max-w-[1120px] gap-x-12 gap-y-8 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_244px] xl:px-12 ${moved ? 'content-in' : ''}`}
          >
            {closed ? (
              /* Het slot. Een colofon, geen feest: wat je deed, waar je staat,
                 en de volgende les bij naam. */
              <>
                <article className="min-w-0 max-w-[62ch]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
                    Afronding
                  </p>
                  <h1 className="mt-2 font-serif text-[30px] leading-[1.12] tracking-tight text-slate-900 dark:text-foreground">
                    Les {lesson.day} is af
                  </h1>
                  <p className="mt-3 font-serif text-[16.5px] leading-[1.75] text-slate-700 dark:text-foreground/85">
                    Je las {reference} en liep de les van begin tot eind door.{' '}
                    {noteWords > 0
                      ? 'Je aantekening staat in de marge hiernaast.'
                      : 'De vraag blijft staan; je kunt er later op terugkomen.'}{' '}
                    Meer hoeft er vandaag niet.
                  </p>

                  <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-slate-300 py-5 sm:grid-cols-4 dark:border-border">
                    {[
                      { label: 'Gelezen', value: reference },
                      { label: 'Aantekening', value: `${noteWords} woorden` },
                      { label: 'Van deze studie', value: `${demo.lessonsDone + 1}/${study.lessonsTotal}` },
                      { label: 'Dagen op rij', value: String(demo.streak + 1) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd
                          className="mt-1 font-serif text-[17px] leading-tight tabular-nums text-slate-900 dark:text-foreground"
                          style={item.label === 'Dagen op rij' ? { color: TEAL } : undefined}
                        >
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    {next ? (
                      <Link
                        href={`/studie/versie-1/${study.id}/${next.day}`}
                        className="press inline-flex h-10 items-center rounded-[3px] px-5 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 focus-visible:ring-offset-2"
                        style={{ backgroundColor: TEAL }}
                      >
                        Les {next.day}: {next.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] text-slate-700 dark:text-foreground">
                        Dit was de laatste les van deze studie.
                      </p>
                    )}
                    <Link
                      href={`/studies/versie-1/${study.id}`}
                      className="text-[13px] text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:text-muted-foreground dark:hover:text-foreground"
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
                  {step === 'intro' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 font-serif text-[30px] leading-[1.12] tracking-tight text-slate-900 dark:text-foreground">
                        {content.intro?.headline ?? lesson.title}
                      </h1>
                      <div className="mt-5 space-y-5">
                        {(content.intro?.body ?? []).map((paragraph, paragraphIndex) => (
                          <p
                            key={paragraphIndex}
                            className="font-serif text-[17px] leading-[1.78] text-slate-800 dark:text-foreground/90"
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
                      <h1 className="mt-2 font-serif text-[28px] leading-[1.12] tracking-tight text-slate-900 dark:text-foreground">
                        {reference}
                      </h1>
                      <p className="mt-1.5 text-[12px] uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">
                        {translations.find((item) => item.id === translation)?.name ?? translation}
                      </p>
                      <div className="mt-6 border-t border-slate-200 pt-6 dark:border-border">
                        <PassageReader
                          book={passage.book}
                          chapter={passage.chapter}
                          version={translation}
                          verseStart={passage.verseStart}
                          verseEnd={passage.verseEnd}
                          preferences={READING}
                        />
                      </div>
                    </>
                  ) : null}

                  {step === 'depth' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 font-serif text-[28px] leading-[1.12] tracking-tight text-slate-900 dark:text-foreground">
                        Aantekening bij {reference}
                      </h1>

                      {content.depth?.body && content.depth.body.length > 0 ? (
                        <div className="mt-5 space-y-5">
                          {content.depth.body.map((paragraph, paragraphIndex) => (
                            <p
                              key={paragraphIndex}
                              className="font-serif text-[17px] leading-[1.78] text-slate-800 dark:text-foreground/90"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : bookNote?.section ? (
                        <div className="mt-5 space-y-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
                            {bookNote.section.title}
                          </p>
                          <p className="font-serif text-[17px] leading-[1.78] text-slate-800 dark:text-foreground/90">
                            {bookNote.section.summary}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-5 max-w-[52ch] text-[14px] leading-relaxed text-slate-500 dark:text-muted-foreground">
                          Bij dit gedeelte is nog geen aantekening geschreven. Lees het gedeelte
                          gerust nog een keer; de vraag bij de volgende stap gaat over de tekst zelf,
                          niet over de uitleg.
                        </p>
                      )}
                    </>
                  ) : null}

                  {step === 'reflection' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 max-w-[24ch] font-serif text-[26px] leading-[1.24] tracking-tight text-slate-900 dark:text-foreground">
                        {content.reflection.question}
                      </h1>
                      <label
                        htmlFor="atlas-reflectie"
                        className="mt-6 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground"
                      >
                        Jouw aantekening
                      </label>
                      <textarea
                        id="atlas-reflectie"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={9}
                        placeholder={content.reflection.placeholder ?? 'Schrijf op wat je opviel…'}
                        className="mt-2 w-full resize-y rounded-[3px] border border-slate-300 bg-white px-4 py-3 font-serif text-[16px] leading-[1.7] text-slate-800 placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/40 dark:border-border dark:bg-background dark:text-foreground"
                      />
                      <p className="mt-1.5 text-[11.5px] tabular-nums text-slate-400 dark:text-muted-foreground">
                        {noteWords} {noteWords === 1 ? 'woord' : 'woorden'}
                      </p>
                    </>
                  ) : null}

                  {step === 'quiz' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 font-serif text-[28px] leading-[1.12] tracking-tight text-slate-900 dark:text-foreground">
                        Wat bleef er hangen?
                      </h1>
                      <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-slate-600 dark:text-muted-foreground">
                        Loop na waar je op moest letten. Vink af wat je in de tekst hebt zien staan;
                        wat blijft liggen, weet je meteen waar je nog eens naar kijkt.
                      </p>
                      <ul className="mt-6 border-t border-slate-200 dark:border-border">
                        {checkItems.map((item, itemIndex) => {
                          const on = ticked.includes(itemIndex);
                          return (
                            <li key={itemIndex} className="border-b border-slate-200 dark:border-border">
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
                                  className={`text-[15px] leading-relaxed ${on ? 'text-slate-400 line-through dark:text-muted-foreground' : 'text-slate-800 dark:text-foreground'}`}
                                >
                                  {item}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-4 text-[12px] tabular-nums text-slate-500 dark:text-muted-foreground">
                        {ticked.length} van {checkItems.length} afgevinkt · de toets bij deze les telt{' '}
                        {content.quizQuestionCount} vragen
                      </p>
                    </>
                  ) : null}
                </article>

                {/* De marge. Wat de tekst ondersteunt staat ernaast, niet eronder. */}
                <aside className="min-w-0 space-y-6 xl:pt-1">
                  {step === 'intro' && content.intro?.watchFor && content.intro.watchFor.length > 0 ? (
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
                  ) : null}

                  {step === 'word' ? (
                    <>
                      {content.readingCue ? (
                        <Marginal label="Leeswijzer">
                          <p className="italic">{content.readingCue}</p>
                        </Marginal>
                      ) : null}
                      <Marginal label="Vertaling">
                        <label htmlFor="atlas-vertaling" className="sr-only">
                          Kies een vertaling voor dit gedeelte
                        </label>
                        <select
                          id="atlas-vertaling"
                          value={translation}
                          onChange={(event) => setTranslation(event.target.value)}
                          className="w-full rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-[12.5px] text-slate-700 focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/40 dark:border-border dark:bg-background dark:text-foreground"
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
                          <dl className="space-y-3">
                            {content.depth.terms.map((term) => (
                              <div key={term.term}>
                                <dt className="font-semibold text-slate-800 dark:text-foreground">
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
                          <dl className="space-y-2">
                            <div>
                              <dt className="font-semibold text-slate-800 dark:text-foreground">Soort</dt>
                              <dd>{bookNote.genre}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-800 dark:text-foreground">Schrijver</dt>
                              <dd>{bookNote.author}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-slate-800 dark:text-foreground">Geschreven</dt>
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
                      <dl className="space-y-2">
                        <div>
                          <dt className="font-semibold text-slate-800 dark:text-foreground">Gedeelte</dt>
                          <dd className="tabular-nums">{reference}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-800 dark:text-foreground">Vraag</dt>
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
      <footer className="flex-none border-t border-slate-200 dark:border-border">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={back}
            disabled={!closed && index === 0}
            className="press inline-flex h-9 items-center rounded-[3px] px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          >
            Vorige
          </button>

          <p className="text-[11px] tabular-nums text-slate-400 dark:text-muted-foreground">
            {closed ? 'Afronding' : `${STEP_LABEL[step]} · stap ${position} van ${steps.length}`}
          </p>

          {closed ? (
            next ? (
              <Link
                href={`/studie/versie-1/${study.id}/${next.day}`}
                className="press inline-flex h-9 items-center rounded-[3px] px-4 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 focus-visible:ring-offset-2"
                style={{ backgroundColor: TEAL }}
              >
                Volgende les
              </Link>
            ) : (
              <Link
                href={`/studies/versie-1/${study.id}`}
                className="press inline-flex h-9 items-center rounded-[3px] px-4 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 focus-visible:ring-offset-2"
                style={{ backgroundColor: TEAL }}
              >
                Terug naar de studie
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={forward}
              className="press inline-flex h-9 items-center rounded-[3px] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 focus-visible:ring-offset-2"
              style={{ backgroundColor: TEAL }}
            >
              {isLast ? 'Les afronden' : 'Volgende'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
