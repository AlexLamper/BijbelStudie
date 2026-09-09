import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import type { CuratedStudy } from '../../../../lib/data/curated-studies';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import { getVersions } from '../../../../lib/local-data';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../../lib/studyFlow';
import { studyArtFor } from '../../../../lib/studyArt';
import Horizon from '../../../../components/study/variants/c/Horizon';
import LessonIndexC from '../../../../components/study/variants/c/LessonIndexC';
import PlaceTint from '../../../../components/study/variants/c/PlaceTint';
import ReviewStrip from '../../../../components/study/variants/c/ReviewStrip';
import {
  ON_ART,
  ON_ART_FAINT,
  SCRIM_BAND,
  TEAL,
} from '../../../../components/study/variants/c/place';

/** The tint scope. One per page, so the id can be a constant. */
const SCOPE = 'pc-detail';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Ontwerp C - "Doorlopend" - screen 2 of 3: the study itself.
 *
 * A REVIEW URL, and a server component with no database in it. The real
 * /studies/[id] reads the session, the enrollment and StudyProgress; this one
 * resolves the study through `findAnyStudy` - the same pure lookup the real
 * `findStudy` delegates to - and invents its progress below.
 *
 * THE COMBINATION the owner asked for. From ontwerp 2: the study's own palette
 * tinting the page, the lessons as small windows, the one action held at the
 * foot of a long scroll. From ontwerp 1: the title block with its figures, the
 * measured prose column with the legend beside it, and the lessons as a
 * numbered register once there are too many to draw. The banner that carried
 * all of that in ontwerp 2 is now a 76-108px band: a picture, not a stage.
 *
 * And it is the SAME picture as the catalogue's, one step nearer - the second
 * of three distances onto one world (see components/.../c/place.ts). The band
 * is inline SVG, server-rendered, and the LCP element on purpose: it paints
 * with the HTML instead of waiting on hydration or an image request.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const study = findAnyStudy(id);
  return {
    title: `${study ? study.title : 'Studie'} — ontwerp C (Doorlopend)`,
    robots: { index: false, follow: false },
  };
}

/**
 * DEMO DATA. Never read from anywhere, never written back.
 *
 * An id that is not in here shows the screen as someone sees it who has not
 * started yet - deliberately, so both states are reachable by URL
 * (/studies/versie-c/opstanding against /studies/versie-c/boek-genesis). On the
 * real page this comes from StudyEnrollment and StudyProgress.
 */
const DEMO_ENROLMENTS: Record<string, { currentDay: number; completedDays: number[] }> = {
  opstanding: { currentDay: 3, completedDays: [1, 2] },
  'boek-johannes': { currentDay: 8, completedDays: [1, 2, 3, 4, 5, 6, 7] },
  'boek-psalmen': { currentDay: 13, completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  'boek-ruth': { currentDay: 4, completedDays: [1, 2, 3, 4] },
};

/** Books in lesson order, each with the chapters this study visits. */
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
      chapters: contiguous
        ? `${chapters[0]}-${chapters[chapters.length - 1]}`
        : chapters.join(', '),
    };
  });
}

function Figure({ label, value, teal = false }: { label: string; value: string; teal?: boolean }) {
  return (
    <div>
      <dt className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-0.5 text-[20px] font-bold leading-none tabular-nums text-gray-900 dark:text-foreground"
        style={teal ? { color: TEAL } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pc-edge flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0">
      <dt className="flex-none text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[12.5px] text-gray-700 dark:text-foreground">{children}</dd>
    </div>
  );
}

export default async function DoorlopendStudyPage({ params }: PageProps) {
  const { id } = await params;
  const study = findAnyStudy(id);
  if (!study) notFound();

  const entry = CATALOGUE_ENTRIES.find((row) => row.study.id === study.id);
  const art = studyArtFor(study.id, study.type);
  const scene = sceneSpec(art.scene);

  // The translation names are static and belong to no user.
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const translationName =
    versions.find((version) => version.id === study.startVersion)?.name ?? study.startVersion;

  const enrolment = DEMO_ENROLMENTS[study.id] ?? null;
  const total = study.lessons.length;
  const completed = new Set(enrolment?.completedDays ?? []);
  const doneCount = study.lessons.filter((lesson) => completed.has(lesson.day)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const finished = enrolment !== null && doneCount >= total;
  const currentDay = enrolment?.currentDay ?? study.lessons[0]?.day ?? 1;
  const currentLesson = study.lessons.find((lesson) => lesson.day === currentDay);

  const minutes = estimateStudyMinutes(study);
  const plan = readingPlan(study);
  const prose = (study.about && study.about.length > 0 ? study.about : [study.description]).slice(0, 3);

  const actionLabel = finished
    ? 'Nog een keer doen'
    : enrolment
      ? `Verder met les ${currentDay}`
      : 'Begin bij les 1';
  const actionDay = enrolment ? currentDay : (study.lessons[0]?.day ?? 1);
  const actionHref = `/studie/versie-c/${encodeURIComponent(study.id)}/${actionDay}`;

  return (
    <div id={SCOPE} className="pc-ground h-full overflow-y-auto overflow-x-hidden">
      <PlaceTint scopeId={SCOPE} palette={art.palette} />
      <ReviewStrip />

      {/* The band. The catalogue's window, one step nearer: same seed, same
          light, a taller crop of the same ridge. It carries the way back and
          the name of the view - nothing else, which is what lets it be a band
          instead of a stage. */}
      <header className="relative h-[76px] w-full sm:h-[92px] lg:h-[108px]">
        <Horizon art={art} distance="nabij" artClassName="pc-approach" className="h-full w-full">
          <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_BAND }} />

          <div className="absolute inset-0 flex items-center justify-between gap-4 px-4 sm:px-8 xl:px-12">
            <Link
              href="/studies/versie-c"
              data-track="study_back"
              className="pc-focus-art press group inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium no-underline backdrop-blur transition-colors"
              style={{
                color: ON_ART,
                borderColor: 'rgba(255,255,255,0.32)',
                backgroundColor: 'rgba(2,6,23,0.42)',
              }}
            >
              <ArrowLeft
                size={14}
                aria-hidden
                className="flex-none transition-transform duration-200 motion-safe:group-hover:-translate-x-0.5"
              />
              Alle landschappen
            </Link>

            <p
              className="hidden text-right text-[10px] font-bold uppercase tracking-[0.18em] sm:block"
              style={{ color: ON_ART_FAINT }}
            >
              Uitzicht: {scene.name}
            </p>
          </div>
        </Horizon>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 xl:px-12">
        {/* The title block, on the ground rather than on the picture. That move
            is what shrank the banner: nothing on the band has to be readable
            over a sky any more. */}
        <div className="flex flex-col gap-6 pt-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[60ch]">
            <p className="pc-ink text-[10px] font-bold uppercase tracking-[0.18em]">
              {TYPE_LABEL[study.type]}
              {entry?.kind && entry.kind !== TYPE_LABEL[study.type] ? ` · ${entry.kind}` : ''}
            </p>
            <h1 className="mt-1.5 text-[30px] font-bold leading-tight text-gray-900 dark:text-foreground xl:text-[40px]">
              {study.title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-muted-foreground">
              {study.description}
            </p>
          </div>

          <dl className="pc-edge flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 xl:border-t-0 xl:pt-0">
            <Figure label="Lessen" value={String(total)} />
            <Figure label="Tijd totaal" value={formatStudyMinutes(minutes)} />
            {enrolment ? (
              <Figure label="Voortgang" value={`${doneCount}/${total}`} teal />
            ) : (
              <Figure label="Per les" value={`± ${study.lessons[0]?.estimatedMinutes ?? 12} min`} />
            )}
          </dl>
        </div>

        {/* The one next step, directly under the head. */}
        <div className="pc-edge mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y py-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-muted-foreground">
              {finished ? 'Afgerond' : enrolment ? 'Waar je gebleven was' : 'Beginnen'}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-gray-800 dark:text-foreground">
              {finished
                ? `Je deed alle ${total} lessen van deze studie.`
                : currentLesson
                  ? `Les ${currentDay} — ${currentLesson.title}`
                  : 'Deze studie heeft nog geen lessen.'}
            </p>
          </div>

          <div className="flex flex-none items-center gap-4">
            <span className="hidden text-[11.5px] tabular-nums text-gray-500 sm:inline dark:text-muted-foreground">
              {enrolment ? `${pct}% gedaan` : `${total} lessen · ${formatStudyMinutes(minutes)}`}
            </span>
            <Link
              href={actionHref}
              data-track="study_start"
              className="pc-primary pc-focus press inline-flex h-10 items-center rounded-xl px-5 text-[13px] font-semibold text-white no-underline transition-colors"
            >
              {actionLabel}
            </Link>
          </div>
        </div>

        <div className="grid gap-x-12 gap-y-10 py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          <div className="min-w-0">
            <div className="max-w-[66ch]">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
                Waar gaat deze studie over?
              </h2>
              <div className="mt-3 space-y-4">
                {prose.map((paragraph, index) => (
                  <p key={index} className="text-[15.5px] leading-[1.72] text-foreground/85">
                    {paragraph}
                  </p>
                ))}
              </div>

              {study.outcomes && study.outcomes.length > 0 && (
                <div className="pc-edge mt-8 border-t pt-5">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
                    Wat je meeneemt
                  </h2>
                  <ol className="mt-3 space-y-2">
                    {study.outcomes.map((outcome, index) => (
                      <li
                        key={index}
                        className="flex gap-3 text-[14px] leading-relaxed text-gray-700 dark:text-foreground/85"
                      >
                        <span
                          aria-hidden
                          className="pc-ink flex-none pt-[3px] font-mono text-[11px] tabular-nums"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="pc-wash pc-edge mt-8 rounded-xl border p-4">
                <p className="text-[13px] leading-relaxed text-foreground/80">
                  Elke les loopt dezelfde route: eerst de context, dan het gedeelte zelf, dan de
                  uitleg, dan je eigen antwoord en tot slot een korte toetsing. Je kunt op elk moment
                  stoppen — de les onthoudt waar je gebleven was.
                </p>
              </div>
            </div>

            <div className="mt-9 max-w-[66ch]">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 dark:text-foreground">
                Legenda
              </h2>
              <dl className="mt-2">
                <LegendRow label="Soort">{TYPE_LABEL[study.type]}</LegendRow>
                {entry?.kind && <LegendRow label="Register">{entry.kind}</LegendRow>}
                <LegendRow label="Gedeelte">
                  <span className="block leading-snug">
                    {plan.map((row) => `${row.book} ${row.chapters}`).join(' · ')}
                  </span>
                </LegendRow>
                <LegendRow label="Lessen">
                  <span className="tabular-nums">{total}</span>
                </LegendRow>
                <LegendRow label="Tijd totaal">
                  <span className="tabular-nums">± {formatStudyMinutes(minutes)}</span>
                </LegendRow>
                <LegendRow label="Ritme">
                  {RHYTHM_LABEL[study.suggestedRhythm ?? 'dagelijks'] ?? 'Elke dag'}
                </LegendRow>
                <LegendRow label="Uitleg">
                  {DEPTH_LABEL[study.suggestedDepth ?? 'kort'] ?? 'Korte uitleg'}
                </LegendRow>
                <LegendRow label="Vertaling">{translationName}</LegendRow>
                <LegendRow label="Uitzicht">
                  {scene.name}, {art.season === 'spring'
                    ? 'voorjaar'
                    : art.season === 'summer'
                      ? 'zomer'
                      : art.season === 'autumn'
                        ? 'najaar'
                        : 'winter'}
                </LegendRow>
              </dl>
            </div>
          </div>

          <div className="min-w-0">
            <LessonIndexC
              studyId={study.id}
              art={art}
              lessons={study.lessons.map((lesson) => ({
                day: lesson.day,
                title: lesson.title,
                reference: `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`,
                minutes: lesson.estimatedMinutes ?? 12,
                focus: lesson.focus,
              }))}
              completedDays={enrolment?.completedDays ?? []}
              currentDay={enrolment ? currentDay : null}
              enrolled={enrolment !== null}
            />

            {enrolment === null && (
              <p className="mt-4 max-w-[52ch] text-[12.5px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                Je bent nog niet aan deze studie begonnen. Alle lessen staan hierboven; je kunt bij
                les 1 beginnen wanneer je wilt.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* The one action, held at the foot of the scroller so it is reachable
          from anywhere on the page - a 150-lesson study is a long scroll. */}
      <div className="pc-edge sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 xl:px-12">
          <div className="min-w-[200px] flex-1">
            <p className="text-[12px] font-medium tabular-nums text-gray-500 dark:text-muted-foreground">
              {doneCount} van {total} lessen afgerond
            </p>
            <div
              className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Voortgang in deze studie"
            >
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>

          <Link
            href={actionHref}
            className="pc-primary pc-focus press inline-flex h-11 flex-none items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline transition-colors"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
