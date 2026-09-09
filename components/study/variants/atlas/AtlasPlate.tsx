import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { formatStudyMinutes } from '../../../../lib/studyFlow';
import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';
import { studyArtFor } from './art';
import { HorizonBand } from './AtlasHorizon';

const TEAL = '#0D9488';

/**
 * Ontwerp 1 - Atlas. De studie als plaat in het register.
 *
 * Een breed titelblok, dan de horizon als een enkele band van 16:3 - geen
 * hero-beeld: de kop staat erboven en verft als eerste, wat
 * LEARNING_UX_RESEARCH.md over zware beelden en LCP vraagt. Daaronder de
 * beschrijving als lopende tekst in een gemeten kolom, met de feiten als
 * legenda in de marge, en de lessen als genummerd register met de gedeelten
 * rechts uitgelijnd - de inhoudsopgave van een naslagwerk.
 *
 * Server component: alles wat hier staat is statische studiegegevens plus de
 * demostand die de pagina meegeeft. Geen state, geen fetch, geen database.
 */

const TYPE_LABEL: Record<CuratedStudy['type'], string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Thema',
};

const RHYTHM_LABEL: Record<string, string> = {
  dagelijks: 'Elke dag',
  'drie-per-week': 'Drie keer per week',
  wekelijks: 'Eén keer per week',
  eigen: 'Eigen dagen',
  vrij: 'Zonder ritme',
};

const DEPTH_LABEL: Record<string, string> = {
  kort: 'Korte uitleg',
  diep: 'Diepe uitleg',
};

export interface AtlasEnrolment {
  currentDay: number;
  completedDays: number[];
}

export interface AtlasPlateProps {
  study: CuratedStudy;
  /** "Wet", "Evangelie", "Persoon" - het woord waaronder het register de studie zet. */
  kind: string;
  /** De naam van de vertaling waarin de studie opent. */
  translationName: string;
  /** Demostand; `null` toont het scherm zoals iemand het ziet die nog niet begon. */
  enrolment: AtlasEnrolment | null;
}

/** Boeken in lesvolgorde, elk met de hoofdstukken die deze studie aandoet. */
function readingPlan(study: CuratedStudy): { book: string; chapters: string }[] {
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  return books.map((book) => {
    const chapters = [
      ...new Set(study.lessons.filter((lesson) => lesson.book === book).map((lesson) => lesson.chapter)),
    ].sort((a, b) => a - b);
    if (chapters.length === 1) return { book, chapters: String(chapters[0]) };
    const contiguous = chapters[chapters.length - 1] - chapters[0] + 1 === chapters.length;
    return {
      book,
      chapters: contiguous ? `${chapters[0]}–${chapters[chapters.length - 1]}` : chapters.join(', '),
    };
  });
}

function Figure({ label, value, teal = false }: { label: string; value: string; teal?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-0.5 font-serif text-[22px] leading-none tabular-nums text-slate-900 dark:text-foreground"
        style={teal ? { color: TEAL } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2 last:border-b-0 dark:border-border">
      <dt className="flex-none text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[12.5px] text-slate-700 dark:text-foreground">{children}</dd>
    </div>
  );
}

export default function AtlasPlate({ study, kind, translationName, enrolment }: AtlasPlateProps) {
  const art = studyArtFor({ id: study.id, kind, type: study.type });
  const plan = readingPlan(study);
  const totalMinutes = study.lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes ?? 12),
    0,
  );

  const completed = new Set(enrolment?.completedDays ?? []);
  const doneCount = study.lessons.filter((lesson) => completed.has(lesson.day)).length;
  const total = study.lessons.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const finished = enrolment !== null && doneCount >= total;
  const currentDay = enrolment?.currentDay ?? study.lessons[0]?.day ?? 1;
  const currentLesson = study.lessons.find((lesson) => lesson.day === currentDay);

  /** De beschrijving, hooguit drie alinea's - daarna leest niemand meer door. */
  const prose = (study.about && study.about.length > 0 ? study.about : [study.description]).slice(0, 3);

  const actionLabel = finished
    ? 'Nog een keer doen'
    : enrolment
      ? `Verder met les ${currentDay}`
      : 'Begin bij les 1';
  const actionHref = `/studie/versie-1/${study.id}/${enrolment ? currentDay : (study.lessons[0]?.day ?? 1)}`;

  const rowGrid =
    'grid items-baseline gap-x-4 grid-cols-[2rem_minmax(0,1fr)_3.5rem] md:grid-cols-[2rem_minmax(0,1fr)_9rem_3.5rem]';

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#FAF8F4] dark:bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-8 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-200 pb-2 dark:border-border">
          <Link
            href="/studies/versie-1"
            className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 no-underline transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 dark:text-muted-foreground dark:hover:text-foreground"
          >
            <ArrowLeft size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Terug naar het register
          </Link>
          <StudyFlowVariantSwitcher />
        </div>

        {/* Titelblok. Breed, met de cijfers rechts als colofon. */}
        <header className="mt-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[58ch]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
              {TYPE_LABEL[study.type]} · {kind}
            </p>
            <h1 className="mt-1.5 font-serif text-[32px] leading-[1.08] tracking-tight text-slate-900 xl:text-[42px] dark:text-foreground">
              {study.title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-muted-foreground">
              {study.description}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-4 xl:border-t-0 xl:pt-0 dark:border-border">
            <Figure label="Lessen" value={String(total)} />
            <Figure label="Tijd totaal" value={formatStudyMinutes(totalMinutes)} />
            {enrolment ? (
              <Figure label="Voortgang" value={`${doneCount}/${total}`} teal />
            ) : (
              <Figure label="Per les" value={`± ${study.lessons[0]?.estimatedMinutes ?? 12} min`} />
            )}
          </dl>
        </header>

        {/* De horizon als band, met bijschrift. Eén beeld, één regel eronder. */}
        <figure className="mt-6">
          <HorizonBand
            art={art}
            label={`Horizon bij de studie ${study.title}`}
            className="h-[92px] w-full rounded-[3px] ring-1 ring-slate-900/10 xl:h-[124px] dark:ring-white/10"
          />
          <figcaption className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">
            <span>Horizon bij deze studie</span>
            <span>{art.caption}</span>
          </figcaption>
        </figure>

        {/* De ene volgende stap, direct onder de plaatkop. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-slate-300 py-3 dark:border-border">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
              {finished ? 'Afgerond' : enrolment ? 'Waar je gebleven was' : 'Beginnen'}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-slate-800 dark:text-foreground">
              {finished
                ? `Je deed alle ${total} lessen van deze studie.`
                : currentLesson
                  ? `Les ${currentDay} — ${currentLesson.title}`
                  : 'Deze studie heeft nog geen lessen.'}
            </p>
          </div>

          <div className="flex flex-none items-center gap-4">
            <span className="hidden text-[11.5px] tabular-nums text-slate-500 sm:inline dark:text-muted-foreground">
              {enrolment ? `${pct}% gedaan` : `${total} lessen · ${formatStudyMinutes(totalMinutes)}`}
            </span>
            <Link
              href={actionHref}
              data-track="study_start"
              className="press inline-flex h-10 items-center rounded-[3px] px-5 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60 focus-visible:ring-offset-2"
              style={{ backgroundColor: TEAL }}
            >
              {actionLabel}
            </Link>
          </div>
        </div>

        {/* De tekst in een gemeten kolom, de feiten als legenda ernaast. */}
        <div className="mt-9 grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,1fr)_252px]">
          <div className="min-w-0 max-w-[66ch]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-foreground">
              Waar gaat deze studie over?
            </h2>
            <div className="mt-3 space-y-4">
              {prose.map((paragraph, index) => (
                <p
                  key={index}
                  className="font-serif text-[16.5px] leading-[1.72] text-slate-800 dark:text-foreground/90"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {study.outcomes && study.outcomes.length > 0 ? (
              <div className="mt-8 border-t border-slate-200 pt-5 dark:border-border">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-foreground">
                  Wat je meeneemt
                </h2>
                <ol className="mt-3 space-y-2">
                  {study.outcomes.map((outcome, index) => (
                    <li key={index} className="flex gap-3 text-[14px] leading-relaxed text-slate-700 dark:text-foreground/85">
                      <span
                        className="flex-none pt-[3px] font-mono text-[11px] tabular-nums"
                        style={{ color: TEAL }}
                        aria-hidden
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <aside className="lg:border-l lg:border-slate-200 lg:pl-6 dark:lg:border-border">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-foreground">
              Legenda
            </h2>
            <dl className="mt-2">
              <LegendRow label="Soort">{TYPE_LABEL[study.type]}</LegendRow>
              <LegendRow label="Register">{kind}</LegendRow>
              <LegendRow label="Gedeelte">
                <span className="block leading-snug">
                  {plan.map((entry) => `${entry.book} ${entry.chapters}`).join(' · ')}
                </span>
              </LegendRow>
              <LegendRow label="Lessen">
                <span className="tabular-nums">{total}</span>
              </LegendRow>
              <LegendRow label="Tijd totaal">
                <span className="tabular-nums">± {formatStudyMinutes(totalMinutes)}</span>
              </LegendRow>
              <LegendRow label="Ritme">
                {RHYTHM_LABEL[study.suggestedRhythm ?? 'dagelijks'] ?? 'Elke dag'}
              </LegendRow>
              <LegendRow label="Uitleg">
                {DEPTH_LABEL[study.suggestedDepth ?? 'kort'] ?? 'Korte uitleg'}
              </LegendRow>
              <LegendRow label="Vertaling">{translationName}</LegendRow>
            </dl>

            {enrolment ? (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-border">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-muted-foreground">
                  Voortgang
                </p>
                <div className="mt-2 h-[3px] w-full overflow-hidden bg-slate-200 dark:bg-secondary">
                  <div className="h-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                </div>
                <p className="mt-1.5 text-[11.5px] tabular-nums text-slate-500 dark:text-muted-foreground">
                  {doneCount} van {total} lessen · {pct}%
                </p>
              </div>
            ) : (
              <p className="mt-5 border-t border-slate-200 pt-4 text-[12px] leading-relaxed text-slate-500 dark:border-border dark:text-muted-foreground">
                Je bent nog niet aan deze studie begonnen. Alle lessen staan hieronder; je kunt bij les
                1 beginnen wanneer je wilt.
              </p>
            )}
          </aside>
        </div>

        {/* De lessen als genummerd register: nummer links, gedeelte rechts. */}
        <section className="mt-12 pb-24">
          <div className="flex items-baseline justify-between gap-4 border-b border-slate-900/70 pb-1.5 dark:border-foreground/40">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900 dark:text-foreground">
              Inhoud
            </h2>
            <span className="text-[11px] tabular-nums text-slate-500 dark:text-muted-foreground">
              {enrolment ? `${doneCount} van ${total} afgerond` : `${total} lessen`}
            </span>
          </div>

          <div
            aria-hidden
            className={`${rowGrid} border-b border-slate-200 px-2 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:border-border dark:text-muted-foreground`}
          >
            <span>Nr.</span>
            <span>Les</span>
            <span className="hidden text-right md:block">Gedeelte</span>
            <span className="text-right">Min.</span>
          </div>

          <ol className="mt-1">
            {study.lessons.map((lesson) => {
              const isDone = completed.has(lesson.day);
              const isCurrent = enrolment !== null && lesson.day === currentDay && !finished;
              const reference = `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;
              const minutes = lesson.estimatedMinutes ?? 12;

              return (
                <li key={lesson.day}>
                  <Link
                    href={`/studie/versie-1/${study.id}/${lesson.day}`}
                    data-track="study_lesson_open"
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`group ${rowGrid} rounded-[3px] border-l-2 px-2 py-2 no-underline transition-colors hover:bg-[#0D9488]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/60`}
                    style={{ borderLeftColor: isCurrent ? TEAL : 'transparent' }}
                  >
                    <span className="flex items-baseline gap-1.5 font-mono text-[11.5px] tabular-nums text-slate-400 dark:text-muted-foreground">
                      {isDone ? (
                        <Check size={12} strokeWidth={2.5} style={{ color: TEAL }} aria-hidden />
                      ) : null}
                      <span style={isCurrent ? { color: TEAL } : undefined}>
                        {String(lesson.day).padStart(2, '0')}
                      </span>
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[14px] font-medium text-slate-800 transition-colors group-hover:text-[#0D9488] dark:text-foreground dark:group-hover:text-teal-400">
                          {lesson.title}
                        </span>
                        {isCurrent ? (
                          <span
                            className="flex-none text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{ color: TEAL }}
                          >
                            Nu
                          </span>
                        ) : null}
                        {isDone ? <span className="sr-only">Afgerond.</span> : null}
                      </span>
                      {/* De vraag van de les staat alleen bij de les die aan de
                          beurt is - bij honderdvijftig hoofdstukken zou een
                          tweede regel per rij het register onleesbaar maken. */}
                      {isCurrent ? (
                        <span className="mt-0.5 block max-w-[62ch] text-[12.5px] leading-snug text-slate-500 dark:text-muted-foreground">
                          {lesson.focus}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11.5px] tabular-nums text-slate-500 md:hidden dark:text-muted-foreground">
                        {reference}
                      </span>
                    </span>

                    <span className="hidden text-right text-[12px] tabular-nums text-slate-500 md:block dark:text-muted-foreground">
                      {reference}
                    </span>

                    <span className="text-right text-[11.5px] tabular-nums text-slate-400 dark:text-muted-foreground">
                      {minutes}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
