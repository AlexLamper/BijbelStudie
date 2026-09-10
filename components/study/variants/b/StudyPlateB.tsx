import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { studyArtFor } from '../../../../lib/studyArt';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../../lib/studyFlow';
import { Horizon, sceneName, StudyTint, TEAL } from './art';
import ReviewStrip from './ReviewStrip';

/**
 * Ontwerp B - "Dichter" - scherm 2 van 3: de studie zelf.
 *
 * De combinatie die gevraagd werd: de opbouw van ontwerp 1 - titelblok, feiten
 * als legenda, lessen als genummerd register - in de kleur en de typografie van
 * ontwerp 2, met het beeld niet alleen kleiner maar gedegradeerd. De band staat
 * naast de titel in plaats van erboven, 72 pixels hoog, met het uitzicht bij
 * naam eronder. De bovenkant van de pagina is daarmee informatie: wat het is,
 * hoe lang het duurt, waar je gebleven was en wat de volgende stap is - alles
 * boven de vouw.
 *
 * Het palet van de studie tint de pagina: bovenschriften, haarlijnen, hover en
 * de markering van de les die aan de beurt is. De merkkleur blijft waar hij
 * hoort, op de ene knop.
 *
 * Server component. Geen state, geen fetch, geen database - alles hier is
 * statische studiedata plus de demostand die de pagina meegeeft.
 */

const SCOPE = 'b-plaat';

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

export interface DemoEnrolment {
  currentDay: number;
  completedDays: number[];
}

export interface StudyPlateBProps {
  study: CuratedStudy;
  /** "Wet", "Evangelie", "Persoon" - het woord waaronder de catalogus hem zet. */
  kind: string;
  /** De naam van de vertaling waarin de studie opent. */
  translationName: string;
  /** Demostand; `null` toont het scherm zoals iemand het ziet die nog niet begon. */
  enrolment: DemoEnrolment | null;
}

/** Boeken in lesvolgorde, elk met de hoofdstukken die deze studie aandoet. */
function readingPlan(study: CuratedStudy): { book: string; chapters: string }[] {
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  return books.map((book) => {
    const chapters = [
      ...new Set(
        study.lessons.filter((lesson) => lesson.book === book).map((lesson) => lesson.chapter),
      ),
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
      <dt className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-0.5 text-[19px] font-bold leading-none tabular-nums text-gray-900 dark:text-foreground"
        style={teal ? { color: TEAL } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="b-edge flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
      <dt className="flex-none text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[12px] text-gray-700 dark:text-foreground">{children}</dd>
    </div>
  );
}

const ROW_GRID =
  'grid items-baseline gap-x-4 grid-cols-[2rem_minmax(0,1fr)_3rem] md:grid-cols-[2rem_minmax(0,1fr)_9rem_3rem]';

export default function StudyPlateB({ study, kind, translationName, enrolment }: StudyPlateBProps) {
  const art = studyArtFor(study.id, study.type);
  const plan = readingPlan(study);

  const totalMinutes = estimateStudyMinutes(study);

  const completed = new Set(enrolment?.completedDays ?? []);
  const total = study.lessons.length;
  const doneCount = study.lessons.filter((lesson) => completed.has(lesson.day)).length;
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
  const actionDay = enrolment ? currentDay : (study.lessons[0]?.day ?? 1);
  const actionHref = `/studie/versie-b/${encodeURIComponent(study.id)}/${actionDay}`;

  return (
    <div id={SCOPE} className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <StudyTint scope={SCOPE} palette={art.palette} />
      <ReviewStrip />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-4 sm:px-6 xl:px-10">
        <div className="b-edge flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b py-2">
          <Link
            href="/studies/versie-b"
            className="b-focus group inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 no-underline transition-colors hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground"
          >
            <ArrowLeft
              size={13}
              aria-hidden
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            Alle studies
          </Link>
          {/* Rechts staat waar je in de Bijbel terechtkomt - de soort en de
              rubriek staan al in het bovenschrift van de titel, en die twee keer
              zetten maakt de regel niet informatiever. */}
          <p className="min-w-0 truncate text-[11px] tabular-nums text-gray-400 dark:text-muted-foreground">
            {plan.map((entry) => `${entry.book} ${entry.chapters}`).join(' · ')}
          </p>
        </div>

        {/* Titelblok. De band staat ernaast en is 72 hoog: het beeld hoort bij
            de studie, maar het is niet het nieuws. */}
        <header className="mt-5 grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_296px] lg:items-end">
          <div className="min-w-0">
            <p className="b-ink text-[10px] font-bold uppercase tracking-[0.18em]">
              {TYPE_LABEL[study.type]} · {kind}
            </p>
            <h1 className="mt-1 max-w-[24ch] text-[28px] font-bold leading-[1.1] text-gray-900 xl:text-[34px] dark:text-foreground">
              {study.title}
            </h1>
            <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-gray-500 dark:text-muted-foreground">
              {study.description}
            </p>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              <Figure label="Lessen" value={String(total)} />
              <Figure label="Tijd totaal" value={formatStudyMinutes(totalMinutes)} />
              <Figure
                label="Per les"
                value={`± ${study.lessons[0]?.estimatedMinutes ?? 12} min`}
              />
              {enrolment ? <Figure label="Afgerond" value={`${doneCount}/${total}`} teal /> : null}
            </dl>
          </div>

          <figure className="min-w-0">
            <Horizon
              art={art}
              ratio={[296, 72]}
              className="h-[72px] w-full rounded-lg shadow-sm xl:h-[84px]"
            />
            <figcaption className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
              <span>Uitzicht bij deze studie</span>
              <span>{sceneName(art)}</span>
            </figcaption>
          </figure>
        </header>

        {/* De ene volgende stap, direct onder de kop. */}
        <div className="b-edge mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
              {finished ? 'Afgerond' : enrolment ? 'Waar je gebleven was' : 'Beginnen'}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-gray-800 dark:text-foreground">
              {finished
                ? `Je deed alle ${total} lessen van deze studie.`
                : currentLesson
                  ? `Les ${currentDay} — ${currentLesson.title}`
                  : 'Deze studie heeft nog geen lessen.'}
            </p>
            {enrolment ? (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Voortgang in deze studie"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: TEAL }}
                  />
                </span>
                <span className="text-[11px] tabular-nums text-gray-500 dark:text-muted-foreground">
                  {pct}%
                </span>
              </div>
            ) : null}
          </div>

          <Link
            href={actionHref}
            data-track="study_start"
            className="b-primary b-focus press inline-flex h-10 flex-none items-center rounded-lg px-5 text-[13.5px] font-semibold text-white no-underline transition-colors"
          >
            {actionLabel}
          </Link>
        </div>

        {/* De tekst in een gemeten kolom, de feiten als legenda ernaast. */}
        <div className="mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_268px]">
          <div className="min-w-0 max-w-[66ch]">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
              Waar gaat deze studie over?
            </h2>
            <div className="mt-2.5 space-y-3.5">
              {prose.map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            {study.outcomes && study.outcomes.length > 0 ? (
              <div className="b-edge mt-7 border-t pt-5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
                  Wat je meeneemt
                </h2>
                <ol className="mt-2.5 space-y-2">
                  {study.outcomes.map((outcome, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-[13.5px] leading-relaxed text-gray-700 dark:text-foreground/85"
                    >
                      <span aria-hidden className="b-ink flex-none pt-[2px] text-[11px] font-bold tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="b-wash b-edge mt-7 rounded-xl border p-4">
              <p className="text-[12.5px] leading-relaxed text-foreground/80">
                Elke les loopt dezelfde route: eerst de context, dan het gedeelte zelf, dan de
                aantekening, dan je eigen antwoord en tot slot een korte toetsing. Je kunt op elk
                moment stoppen — de les onthoudt waar je gebleven was.
              </p>
            </div>
          </div>

          <aside className="min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
              Legenda
            </h2>
            <dl className="mt-1.5">
              <LegendRow label="Soort">{TYPE_LABEL[study.type]}</LegendRow>
              <LegendRow label="Rubriek">{kind}</LegendRow>
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
              <LegendRow label="Uitzicht">{sceneName(art)}</LegendRow>
            </dl>

            {enrolment ? (
              <div className="b-edge mt-5 border-t pt-4">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-muted-foreground">
                  Voortgang
                </p>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
                </div>
                <p className="mt-1.5 text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
                  {doneCount} van {total} lessen · {pct}%
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                  Wat je afrondt telt mee voor je boom bij Voortgang.
                </p>
              </div>
            ) : (
              <p className="b-edge mt-5 border-t pt-4 text-[11.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                Je bent nog niet aan deze studie begonnen. Alle lessen staan hieronder; je kunt bij les
                1 beginnen wanneer je wilt.
              </p>
            )}
          </aside>
        </div>

        {/* De lessen als genummerd register: nummer links, gedeelte rechts. */}
        <section className="mt-10 pb-8">
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
            className={`${ROW_GRID} b-edge border-b px-2 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-muted-foreground`}
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
                    href={`/studie/versie-b/${encodeURIComponent(study.id)}/${lesson.day}`}
                    data-track="study_lesson_open"
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`b-row b-focus group ${ROW_GRID} rounded-md border-l-2 px-2 py-2 no-underline transition-colors ${isCurrent ? 'b-mark' : 'border-l-transparent'}`}
                  >
                    <span className="flex items-baseline gap-1.5 text-[11.5px] tabular-nums text-gray-400 dark:text-muted-foreground">
                      {isDone ? (
                        <Check size={12} strokeWidth={2.5} style={{ color: TEAL }} aria-hidden />
                      ) : null}
                      <span className={isCurrent ? 'b-ink font-bold' : undefined}>
                        {String(lesson.day).padStart(2, '0')}
                      </span>
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="b-row-title truncate text-[13.5px] font-medium text-gray-800 transition-colors dark:text-foreground">
                          {lesson.title}
                        </span>
                        {isCurrent ? (
                          <span className="b-ink flex-none text-[9px] font-bold uppercase tracking-[0.14em]">
                            Nu
                          </span>
                        ) : null}
                        {isDone ? <span className="sr-only">Afgerond.</span> : null}
                      </span>
                      {/* De vraag van de les staat alleen bij de les die aan de
                          beurt is: bij honderdvijftig hoofdstukken maakt een
                          tweede regel per rij het register onleesbaar. */}
                      {isCurrent ? (
                        <span className="mt-0.5 block max-w-[62ch] text-[12px] leading-snug text-gray-500 dark:text-muted-foreground">
                          {lesson.focus}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11.5px] tabular-nums text-gray-500 md:hidden dark:text-muted-foreground">
                        {reference}
                      </span>
                    </span>

                    <span className="hidden text-right text-[12px] tabular-nums text-gray-500 md:block dark:text-muted-foreground">
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
        </section>
      </div>

      {/* De actie blijft bereikbaar: een register van honderdvijftig regels is
          een lange rol, en dan hoort de volgende stap niet alleen bovenaan. */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-background/95 backdrop-blur dark:border-border">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-2 sm:px-6 xl:px-10">
          <p className="min-w-0 truncate text-[11.5px] tabular-nums text-gray-500 dark:text-muted-foreground">
            {enrolment
              ? `${doneCount} van ${total} lessen afgerond · ${pct}%`
              : `${total} lessen · ± ${formatStudyMinutes(totalMinutes)} in totaal`}
          </p>
          <Link
            href={actionHref}
            className="b-primary b-focus press inline-flex h-9 flex-none items-center rounded-lg px-4 text-[13px] font-semibold text-white no-underline transition-colors"
          >
            {finished ? 'Opnieuw beginnen' : `Les ${actionDay} openen`}
          </Link>
        </div>
      </div>
    </div>
  );
}
