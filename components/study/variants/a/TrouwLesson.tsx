'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

import type { StudyType } from '../../../../lib/data/curated-studies';
import { studyArtFor, type StudyArtKind } from '../../../../lib/studyArt';
import type { StepKey } from '../../../../lib/studyFlow';
import { SURFACE } from '../../flow/lesson-layout';
import HorizonArt from './HorizonArt';
import PassageProse from './PassageProse';
import ReviewStrip from './ReviewStrip';
import { ON_ART, ON_ART_FAINT, ON_ART_MUTED, SCRIM_STRIP, TEAL, tintCss } from './tint';

/**
 * Ontwerp A - "trouw" - scherm 3 van 3: één les.
 *
 * Het oordeel was hier het scherpst: de LAYOUT van ontwerp 1 ("Atlas"), de
 * STYLING van ontwerp 2 ("Vensters"). Dus:
 *
 *  - Layout van Atlas: een leeskolom met een marge ernaast. De stappen zijn een
 *    genummerd register in de linkermarge; de leeswijzer, de vertaling, de
 *    woordverklaringen en de vraag staan náást de tekst in plaats van eronder
 *    gestapeld. Het slot is een eigen plaat in dezelfde kolom, geen stap.
 *  - Styling van Vensters: het palet van deze studie tint de opschriften, de
 *    lijnen, de hover en de focus; de kopregel is de horizonstrook met witte
 *    tekst op een scrim; de margeblokken zijn getinte, afgeronde vlakken; de
 *    letter is schreefloos, behalve de Schrift zelf.
 *
 * Geen database. De bijbeltekst haalt `PassageProse` zelf op bij
 * /api/bible/chapter; alle voortgang op dit scherm is verzonnen demostand uit
 * de pagina, en er wordt niets teruggeschreven.
 *
 * Het scherm erft app/studie/layout.tsx - geen appbalk, de 56px hover-rail, het
 * ingezette afgeronde kader - want de flow is een venster, geen appschil.
 */

const SCOPE = 'va-lesson';

const STEP_LABEL: Record<StepKey, string> = {
  intro: 'Intro',
  word: 'Het Woord',
  depth: 'Verdieping',
  reflection: 'Reflectie',
  quiz: 'Toetsing',
};

export interface TrouwLessonPayload {
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
  next: { day: number; title: string; reference: string } | null;
}

export interface TrouwLessonDemo {
  /** Hoeveel lessen van deze studie al af zijn. */
  lessonsDone: number;
  /** Dagen op rij, zoals het slot ze zou tonen. */
  streak: number;
  /** Wat er al in het reflectieveld stond. */
  note: string;
}

/**
 * Een blok in de marge.
 *
 * Het vlak is niet langer getint: het is `SURFACE`, precies dezelfde
 * informatiekaart die de begeleide flow en het dashboard gebruiken, zodat de
 * drie ontwerpvarianten en de echte les niet uit elkaar lopen. De inkt van de
 * studie blijft waar hij accent is - het opschrift, de haarlijn, de hover, de
 * focusring - en verdwijnt als vlak onder de tekst.
 */
function Marginal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className={`${SURFACE} p-4`}>
      <h2 className="text-[10.5px] font-bold uppercase tracking-[0.16em] va-ink">{label}</h2>
      <div className="mt-2 text-[12.5px] leading-[1.65] text-gray-600 dark:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Eyebrow({ index, step }: { index: number; step: StepKey }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] va-ink">
      Stap {String(index).padStart(2, '0')} · {STEP_LABEL[step]}
    </p>
  );
}

export default function TrouwLesson({
  payload,
  demo,
}: {
  payload: TrouwLessonPayload;
  demo: TrouwLessonDemo;
}) {
  const { study, lesson, steps, passage, content, bookNote, next } = payload;

  const art = useMemo(
    () => studyArtFor(study.id, study.type as StudyArtKind),
    [study.id, study.type],
  );

  const [step, setStep] = useState<StepKey>(steps[0]);
  const [maxReached, setMaxReached] = useState(0);
  const [translation, setTranslation] = useState(payload.translation);
  const [note, setNote] = useState(demo.note);
  const [ticked, setTicked] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);
  // `content-in` hoort niet op server-gerenderde markup; pas na de eerste
  // stapwissel mag de fade meedoen.
  const [moved, setMoved] = useState(false);

  const index = Math.max(0, steps.indexOf(step));
  const position = index + 1;
  const isLast = index === steps.length - 1;

  const reference = `${passage.book} ${passage.chapter}${passage.verseRange ? `:${passage.verseRange}` : ''}`;

  const translations = useMemo(() => {
    // Nederlands eerst: de handleiding zet nl, en en de door elkaar, en dit is
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
  const progressPct = closed ? 100 : Math.round(((index + 1) / (steps.length + 1)) * 100);

  return (
    <div id={SCOPE} className="flex h-full flex-col bg-background">
      <style>{tintCss(SCOPE, art.palette.accent)}</style>

      <div className="flex-none">
        <ReviewStrip sticky={false} />
      </div>

      {/* De kopregel. Eén strook horizon, precies zo hoog als een balk hoort te
          zijn: de plaats van Atlas' kopbalk, in de kleur van Vensters. */}
      <header className="relative h-[62px] flex-none overflow-hidden sm:h-[70px]">
        {/* In een eigen laag, niet met `absolute` op HorizonArt zelf: die zet
            `relative` op zijn wortel, en Tailwind laat `.relative` van de twee
            winnen ongeacht de volgorde in het attribuut. */}
        <div aria-hidden className="absolute inset-0">
          <HorizonArt art={art} ratio={18} quiet className="h-full w-full" />
        </div>
        <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_STRIP }} />

        <div className="absolute inset-0 flex items-center gap-3 px-3 sm:px-5">
          <Link
            href={`/studies/versie-a/${encodeURIComponent(study.id)}`}
            aria-label="Sluit de les en ga terug naar de studie"
            title="Sluit de les"
            className="va-focus-art press inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border no-underline transition-colors"
            style={{
              color: ON_ART,
              borderColor: 'rgba(255,255,255,0.32)',
              backgroundColor: 'rgba(2,6,23,0.42)',
            }}
          >
            <X size={16} aria-hidden />
          </Link>

          {/* De lestitel staat hier én in de marge-index. Onder lg is die index
              er niet, en dan is dit de enige plek waar je leest wélke les je
              open hebt staan. */}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[10px] font-bold uppercase tracking-[0.16em] tabular-nums"
              style={{ color: ON_ART_FAINT }}
            >
              {study.title} · les {lesson.day} van {study.lessonsTotal}
            </p>
            <p className="truncate text-[14.5px] font-bold leading-tight" style={{ color: ON_ART }}>
              {lesson.title}
            </p>
          </div>

          <p className="flex-none text-right text-[11.5px] tabular-nums" style={{ color: ON_ART_MUTED }}>
            <span className="hidden sm:block">{reference}</span>
            <span className="block sm:hidden">
              {closed ? 'Afronding' : `Stap ${position}/${steps.length}`}
            </span>
            <span className="hidden sm:block" style={{ color: ON_ART_FAINT }}>
              ± {lesson.minutes} min
            </span>
          </p>
        </div>

        {/* Onder lg is er geen marge-index; dan zegt deze rail waar je staat.
            De positie staat er hierboven al in woorden, dus de rail is beeld. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px] lg:hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
        >
          <span className="block h-full" style={{ width: `${progressPct}%`, backgroundColor: TEAL }} />
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* De marge-index: de stappen als genummerd register. */}
        <nav
          aria-label="Stappen in deze les"
          className="hidden w-[196px] flex-none flex-col border-r border-gray-200 px-5 py-6 dark:border-border lg:flex"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground">
            Deze les
          </p>
          {/* Geen kop-element: de enige h1 van dit scherm hoort bij de stap die
              je leest, en een h2 dáárvoor zou de koppenvolgorde omdraaien. */}
          <p className="mt-1.5 text-[15px] font-bold leading-snug text-gray-900 dark:text-foreground">
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
                    className={`va-focus flex w-full items-baseline gap-2 rounded-lg py-1 text-left text-[12.5px] transition-colors ${
                      reachable ? 'va-hover' : 'cursor-not-allowed opacity-40'
                    } ${current ? 'font-bold va-ink' : 'text-gray-500 dark:text-muted-foreground'}`}
                  >
                    <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                      {String(itemIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 truncate">{STEP_LABEL[item]}</span>
                    {done ? (
                      <Check
                        size={11}
                        strokeWidth={2.5}
                        className="ml-auto flex-none"
                        style={{ color: TEAL }}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li>
              <span
                aria-current={closed ? 'step' : undefined}
                className={`va-edge flex w-full items-baseline gap-2 border-t pt-2 text-[12.5px] ${
                  closed ? 'font-bold va-ink' : 'text-gray-400 dark:text-muted-foreground'
                }`}
              >
                <span className="flex-none font-mono text-[10.5px] tabular-nums opacity-70">
                  {String(steps.length + 1).padStart(2, '0')}
                </span>
                <span>Afronding</span>
              </span>
            </li>
          </ol>

          <dl className="va-edge mt-auto space-y-2 border-t pt-4 text-[11px]">
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

        {/* De leeskolom met de marge ernaast. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            key={closed ? 'slot' : step}
            className={`mx-auto grid w-full max-w-[1120px] gap-x-12 gap-y-8 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_252px] xl:px-12 ${
              moved ? 'content-in' : ''
            }`}
          >
            {closed ? (
              /* Het slot. Een colofon, geen feest: wat je deed, waar je staat,
                 en de volgende les bij naam. */
              <>
                <article className="min-w-0 max-w-[62ch]">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] va-ink">Afronding</p>
                  <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground sm:text-[34px]">
                    Les {lesson.day} is af
                  </h1>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-foreground/85">
                    Je las {reference} en liep de les van begin tot eind door.{' '}
                    {noteWords > 0
                      ? 'Je aantekening staat in de marge hiernaast.'
                      : 'De vraag blijft staan; je kunt er later op terugkomen.'}{' '}
                    Meer hoeft er vandaag niet.
                  </p>

                  <dl className="va-edge mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-4">
                    {[
                      { label: 'Gelezen', value: reference },
                      { label: 'Aantekening', value: `${noteWords} ${noteWords === 1 ? 'woord' : 'woorden'}` },
                      { label: 'Van deze studie', value: `${demo.lessonsDone + 1}/${study.lessonsTotal}` },
                      { label: 'Dagen op rij', value: String(demo.streak + 1) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd
                          className="mt-1 text-[17px] font-bold leading-tight tabular-nums text-gray-900 dark:text-foreground"
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
                        href={`/studie/versie-a/${encodeURIComponent(study.id)}/${next.day}`}
                        className="va-primary va-focus press inline-flex h-11 items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline transition-colors"
                      >
                        Les {next.day}: {next.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] text-foreground">Dit was de laatste les van deze studie.</p>
                    )}
                    <Link
                      href={`/studies/versie-a/${encodeURIComponent(study.id)}`}
                      className="va-focus va-hover text-[13px] text-gray-500 underline underline-offset-4 transition-colors dark:text-muted-foreground"
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
                  {next ? (
                    <Marginal label="Hierna">
                      <p className="font-semibold text-gray-800 dark:text-foreground">
                        Les {next.day} - {next.title}
                      </p>
                      <p className="mt-0.5 tabular-nums">{next.reference}</p>
                    </Marginal>
                  ) : null}
                </aside>
              </>
            ) : (
              <>
                <article className="min-w-0 max-w-[64ch]">
                  {step === 'intro' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground sm:text-[33px]">
                        {content.intro?.headline ?? lesson.title}
                      </h1>
                      <div className="mt-5 space-y-4">
                        {(content.intro?.body ?? []).map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex} className="text-[15.5px] leading-relaxed text-foreground/90">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {step === 'word' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        {reference}
                      </h1>
                      <p className="mt-1 text-[11.5px] uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                        {translations.find((item) => item.id === translation)?.name ?? translation}
                      </p>
                      {content.readingCue ? (
                        <p className="mt-4 text-[13.5px] italic leading-relaxed text-gray-500 dark:text-muted-foreground xl:hidden">
                          {content.readingCue}
                        </p>
                      ) : null}
                      <div className="va-edge mt-6 border-t pt-6">
                        <PassageProse
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
                      <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        Aantekening bij {reference}
                      </h1>

                      {content.depth?.body && content.depth.body.length > 0 ? (
                        <div className="mt-5 space-y-4">
                          {content.depth.body.map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex} className="text-[15.5px] leading-relaxed text-foreground/90">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : bookNote?.section ? (
                        <div className="mt-5 space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] va-ink">
                            {bookNote.section.title}
                          </p>
                          <p className="text-[15.5px] leading-relaxed text-foreground/90">
                            {bookNote.section.summary}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-5 max-w-[52ch] text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
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
                      <h1 className="mt-2 max-w-[26ch] text-[24px] font-bold leading-snug tracking-tight text-gray-900 dark:text-foreground sm:text-[28px]">
                        {content.reflection.question}
                      </h1>
                      <label
                        htmlFor="trouw-reflectie"
                        className="mt-6 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground"
                      >
                        Jouw aantekening
                      </label>
                      <textarea
                        id="trouw-reflectie"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={9}
                        placeholder={content.reflection.placeholder ?? 'Schrijf op wat je opviel…'}
                        className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
                        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                      />
                      <p className="mt-1.5 text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                        {noteWords} {noteWords === 1 ? 'woord' : 'woorden'} · in het ontwerpvoorbeeld wordt
                        dit niet bewaard
                      </p>
                    </>
                  ) : null}

                  {step === 'quiz' ? (
                    <>
                      <Eyebrow index={position} step={step} />
                      <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground sm:text-[30px]">
                        Wat bleef er hangen?
                      </h1>
                      <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                        Loop na waar je op moest letten. Vink af wat je in de tekst hebt zien staan; wat
                        blijft liggen, weet je meteen waar je nog eens naar kijkt.
                      </p>
                      <ul className="va-edge mt-6 border-t">
                        {checkItems.map((item, itemIndex) => {
                          const on = ticked.includes(itemIndex);
                          return (
                            <li key={itemIndex} className="va-edge border-b">
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
                                      : 'text-foreground'
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
                  ) : null}
                </article>

                {/* De marge. Wat de tekst ondersteunt staat ernaast, niet eronder. */}
                <aside className="min-w-0 space-y-4 xl:pt-1">
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

                  {step === 'intro' ? (
                    <Marginal label="Straks lees je">
                      <p className="tabular-nums">{reference}</p>
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
                        <label htmlFor="trouw-vertaling" className="sr-only">
                          Kies een vertaling voor dit gedeelte
                        </label>
                        <select
                          id="trouw-vertaling"
                          value={translation}
                          onChange={(event) => setTranslation(event.target.value)}
                          className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12.5px] font-medium text-foreground focus:outline-none focus:ring-2 dark:border-border dark:bg-card"
                          style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
                        >
                          {translations.length === 0 ? (
                            <option value={translation}>{translation}</option>
                          ) : (
                            translations.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))
                          )}
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
      <footer className="flex-none border-t border-gray-200 dark:border-border">
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={back}
            disabled={!closed && index === 0}
            className="va-focus press inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-muted-foreground dark:hover:bg-secondary"
          >
            Vorige
          </button>

          <p className="hidden text-[12px] tabular-nums text-gray-400 dark:text-muted-foreground sm:block">
            {closed ? 'Afronding' : `${STEP_LABEL[step]} - stap ${position} van ${steps.length}`}
          </p>

          {closed ? (
            next ? (
              <Link
                href={`/studie/versie-a/${encodeURIComponent(study.id)}/${next.day}`}
                className="va-primary va-focus press inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Volgende les
              </Link>
            ) : (
              <Link
                href={`/studies/versie-a/${encodeURIComponent(study.id)}`}
                className="va-primary va-focus press inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold text-white no-underline transition-colors"
              >
                Terug naar de studie
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={forward}
              className="va-primary va-focus press inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold text-white transition-colors"
            >
              {isLast ? 'Les afronden' : 'Volgende'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
