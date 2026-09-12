import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import { studyArtFor, type StudyArtKind } from '../../../../lib/studyArt';
import { formatStudyMinutes } from '../../../../lib/studyFlow';
import HorizonArt from './HorizonArt';
import ReviewStrip from './ReviewStrip';
import { ON_ART, ON_ART_FAINT, SCRIM_BAND, TEAL, tintCss } from './tint';

/**
 * Ontwerp A - "trouw" - scherm 2 van 3: de studie zelf.
 *
 * Het oordeel over deze pagina was: ontwerp 1 en 2 combineren, en de banner van
 * ontwerp 2 moest véél kleiner - die nam ruimte in die hij niet nodig had. Dus:
 *
 *  - De STRUCTUUR is die van ontwerp 1 ("Atlas"): eerst een smalle band, dan het
 *    titelblok, dan de ene volgende stap, dan de tekst in een gemeten kolom met
 *    de feiten als legenda ernaast, en onderaan de lessen als genummerd register
 *    met de gedeelten rechts uitgelijnd.
 *  - De KLEUR en het lettergebruik zijn die van ontwerp 2 ("Vensters"): het
 *    palet van deze studie tint de opschriften, de lijnen, de hover en de focus,
 *    en het teal blijft over voor de ene actie.
 *  - De band is ongeveer een vijfde van wat ontwerp 2 gebruikte: 84 pixels hoog
 *    in plaats van een beeldvullende hero. Genoeg om te zeggen waar je bent,
 *    niet genoeg om de inhoud van het scherm te duwen.
 *
 * Server component. Geen state, geen fetch, geen database: alles hier is
 * statische studiegegevens plus de demostand die de pagina meegeeft. De band is
 * inline SVG en met opzet de LCP - hij verft mee met de HTML, zonder te wachten
 * op hydratie of op een afbeeldingsverzoek. Nergens een canvas.
 */

const SCOPE = 'va-plate';

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

export interface TrouwEnrolment {
  currentDay: number;
  completedDays: number[];
}

export interface TrouwPlateProps {
  study: CuratedStudy;
  /** "Wet", "Evangelie", "Persoon" - het woord waaronder het register de studie zet. */
  kind: string;
  /** De naam van de vertaling waarin de studie opent. */
  translationName: string;
  /** Demostand; `null` toont het scherm zoals iemand het ziet die nog niet begon. */
  enrolment: TrouwEnrolment | null;
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
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-0.5 text-[21px] font-bold leading-none tabular-nums text-gray-900 dark:text-foreground"
        style={teal ? { color: TEAL } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-200 py-2 last:border-b-0 dark:border-border">
      <dt className="flex-none text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[12.5px] text-gray-700 dark:text-foreground">{children}</dd>
    </div>
  );
}

export default function TrouwPlate({ study, kind, translationName, enrolment }: TrouwPlateProps) {
  const art = studyArtFor(study.id, study.type as StudyArtKind);
  const plan = readingPlan(study);
  const totalMinutes = study.lessons.reduce((sum, lesson) => sum + (lesson.estimatedMinutes ?? 12), 0);

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
  const actionHref = `/studie/versie-a/${encodeURIComponent(study.id)}/${
    enrolment ? currentDay : (study.lessons[0]?.day ?? 1)
  }`;

  const rowGrid =
    'grid items-baseline gap-x-4 grid-cols-[2rem_minmax(0,1fr)_3.25rem] md:grid-cols-[2rem_minmax(0,1fr)_9rem_3.25rem]';

  return (
    <div id={SCOPE} className="bg-background">
      <style>{tintCss(SCOPE, art.palette.accent)}</style>
      <ReviewStrip />

      <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 sm:px-8 xl:px-10">
        <div className="pt-5">
          <Link
            href="/studies/versie-a"
            className="va-focus va-hover group inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 no-underline transition-colors dark:text-muted-foreground"
          >
            <ArrowLeft size={13} aria-hidden className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Terug naar alle studies
          </Link>
        </div>

        {/* De band. Smal met opzet: een vijfde van de hoogte die de hero in
            ontwerp 2 innam, en dus geen scherm dat je eerst moet wegscrollen. */}
        <HorizonArt art={art} ratio={20} className="mt-3 h-[64px] w-full rounded-xl sm:h-[76px] lg:h-[84px]">
          <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_BAND }} />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-baseline justify-between gap-x-4 px-3.5 pb-2 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ON_ART }}>
              {TYPE_LABEL[study.type]} · {kind}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: ON_ART_FAINT }}>
              Uitzicht: {sceneSpec(art.scene).name}
            </p>
          </div>
        </HorizonArt>

        {/* Titelblok. Breed, met de cijfers rechts als colofon. */}
        <header className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[58ch]">
            <p
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ backgroundColor: TEAL, color: '#ffffff' }}
            >
              {TYPE_LABEL[study.type]}
            </p>
            <h1 className="mt-2.5 text-[30px] font-bold leading-[1.1] tracking-tight text-gray-900 dark:text-foreground sm:text-[40px]">
              {study.title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              {study.description}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-gray-200 pt-4 dark:border-border xl:border-t-0 xl:pt-0">
            <Figure label="Lessen" value={String(total)} />
            <Figure label="Tijd totaal" value={formatStudyMinutes(totalMinutes)} />
            {enrolment ? (
              <Figure label="Voortgang" value={`${doneCount}/${total}`} teal />
            ) : (
              <Figure label="Per les" value={`± ${study.lessons[0]?.estimatedMinutes ?? 12} min`} />
            )}
          </dl>
        </header>

        {/* De ene volgende stap, direct onder het titelblok. */}
        <div className="va-edge mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] va-ink">
              {finished ? 'Afgerond' : enrolment ? 'Waar je gebleven was' : 'Beginnen'}
            </p>
            <p className="mt-0.5 truncate text-[14.5px] text-gray-800 dark:text-foreground">
              {finished
                ? `Je deed alle ${total} lessen van deze studie.`
                : currentLesson
                  ? `Les ${currentDay} - ${currentLesson.title}`
                  : 'Deze studie heeft nog geen lessen.'}
            </p>
            {enrolment && !finished && (
              <div
                className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Voortgang in deze studie"
              >
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
              </div>
            )}
          </div>

          <div className="flex flex-none items-center gap-4">
            <span className="hidden text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground sm:inline">
              {enrolment
                ? `${doneCount} van ${total} afgerond`
                : `${total} lessen · ${formatStudyMinutes(totalMinutes)}`}
            </span>
            <Link
              href={actionHref}
              data-track="study_start"
              className="va-primary va-focus press inline-flex h-11 items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline transition-colors"
            >
              {actionLabel}
            </Link>
          </div>
        </div>

        {/* De tekst in een gemeten kolom, de feiten als legenda ernaast. */}
        <div className="mt-9 grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 max-w-[66ch]">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] va-ink">
              Waar gaat deze studie over?
            </h2>
            <div className="mt-3 space-y-4">
              {prose.map((paragraph, index) => (
                <p key={index} className="text-[15.5px] leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            {study.outcomes && study.outcomes.length > 0 ? (
              <div className="va-edge mt-8 border-t pt-5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] va-ink">Wat je meeneemt</h2>
                <ol className="mt-3 space-y-2">
                  {study.outcomes.map((outcome, index) => (
                    <li key={index} className="flex gap-3 text-[14px] leading-relaxed text-foreground/85">
                      <span aria-hidden className="flex-none pt-[3px] font-mono text-[11px] tabular-nums va-ink">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="va-wash va-edge mt-8 rounded-xl border p-4">
              <p className="text-[13px] leading-relaxed text-foreground/80">
                Elke les loopt dezelfde route: eerst de context, dan het gedeelte zelf, dan de uitleg,
                dan je eigen antwoord en tot slot een korte toetsing. Je kunt op elk moment stoppen -
                de les onthoudt waar je gebleven was.
              </p>
            </div>
          </div>

          <aside className="min-w-0 lg:border-l lg:border-gray-200 lg:pl-6 dark:lg:border-border">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] va-ink">Legenda</h2>
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
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-border">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
                  Voortgang
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                </div>
                <p className="mt-1.5 text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
                  {doneCount} van {total} lessen · {pct}%
                </p>
              </div>
            ) : (
              <p className="mt-5 border-t border-gray-200 pt-4 text-[12px] leading-relaxed text-gray-500 dark:border-border dark:text-muted-foreground">
                Je bent nog niet aan deze studie begonnen. Alle lessen staan hieronder; je kunt bij les
                1 beginnen wanneer je wilt.
              </p>
            )}
          </aside>
        </div>

        {/* De lessen als genummerd register: nummer links, gedeelte rechts. */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4 border-b border-gray-900/70 pb-1.5 dark:border-foreground/40">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
              Inhoud
            </h2>
            <span className="text-[11px] tabular-nums text-gray-500 dark:text-muted-foreground">
              {enrolment ? `${doneCount} van ${total} afgerond` : `${total} lessen`}
            </span>
          </div>

          <div
            aria-hidden
            className={`${rowGrid} border-b border-gray-200 px-2 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:border-border dark:text-muted-foreground`}
          >
            <span>Nr.</span>
            <span>Les</span>
            <span className="hidden text-right md:block">Gedeelte</span>
            <span className="text-right">Min.</span>
          </div>

          {total === 0 ? (
            <p className="mt-4 text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              Voor deze studie zijn nog geen lessen samengesteld.
            </p>
          ) : (
            <ol className="mt-1">
              {study.lessons.map((lesson) => {
                const isDone = completed.has(lesson.day);
                const isCurrent = enrolment !== null && lesson.day === currentDay && !finished;
                const reference = `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;
                const minutes = lesson.estimatedMinutes ?? 12;

                return (
                  <li key={lesson.day}>
                    <Link
                      href={`/studie/versie-a/${encodeURIComponent(study.id)}/${lesson.day}`}
                      data-track="study_lesson_open"
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`va-focus group ${rowGrid} rounded-lg border-l-2 px-2 py-2 no-underline transition-colors hover:bg-[#0D9488]/[0.06]`}
                      style={{ borderLeftColor: isCurrent ? TEAL : 'transparent' }}
                    >
                      <span className="flex items-baseline gap-1.5 font-mono text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                        {isDone ? <Check size={12} strokeWidth={2.5} style={{ color: TEAL }} aria-hidden /> : null}
                        <span style={isCurrent ? { color: TEAL } : undefined}>
                          {String(lesson.day).padStart(2, '0')}
                        </span>
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-[14px] font-semibold text-gray-800 transition-colors group-hover:text-[#0D9488] dark:text-foreground dark:group-hover:text-teal-400">
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
                          <span className="mt-0.5 block max-w-[62ch] text-[12.5px] leading-snug text-gray-500 dark:text-muted-foreground">
                            {lesson.focus}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground md:hidden">
                          {reference}
                        </span>
                      </span>

                      <span className="hidden text-right text-[12px] tabular-nums text-gray-500 dark:text-muted-foreground md:block">
                        {reference}
                      </span>

                      <span className="text-right text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                        {minutes}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
