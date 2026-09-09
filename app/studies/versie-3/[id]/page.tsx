import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { CATALOGUE_ENTRIES, avgMinutesOf, findAnyStudy } from '../../../../lib/bookStudies';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../../lib/studyFlow';
import { getVersions } from '../../../../lib/local-data';
import ReviewBar from '../../../../components/study/variants/weg/ReviewBar';
import RouteDetail, { type StopRow } from '../../../../components/study/variants/weg/RouteDetail';
import {
  routeArtFor,
  routeEnds,
  stopReference,
} from '../../../../components/study/variants/weg/routeArt';

/**
 * Ontwerp 3 - "Weg". Het studiescherm: de routekaart.
 *
 * A review URL, never indexed. It inherits `app/studies/layout.tsx`, so the app
 * shell around it is the same one the real /studies/[id] gets.
 *
 * Static data only. `findAnyStudy` (pure, from lib/bookStudies - NOT the
 * enrollment service, which pulls in mongoose) plus `getVersions` for the
 * translation picker. Whether you are enrolled, which stops are behind you and
 * where you would resume is demo data invented below, because this preview must
 * never read a reader's real progress.
 */

const TEAL = '#0D9488';

export const metadata: Metadata = {
  title: 'Ontwerp 3 — Weg · De routekaart',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
};

/** Terrain per study id, the same word the catalogue uses. */
const KIND_BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry.kind]));

/**
 * DEMO DATA. Three stops behind you, the fourth is where you stand - clamped so
 * a three-lesson study does not claim you finished it. Never read from a
 * database; this is a design preview.
 */
const DEMO_STOPS_WALKED = 3;

export default async function WegDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findAnyStudy(id);
  if (!study) notFound();

  const kind = KIND_BY_ID.get(study.id) ?? TYPE_LABEL[study.type] ?? study.type;
  const art = routeArtFor({ id: study.id, type: study.type, kind });
  const ends = routeEnds(study);

  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );

  const stops: StopRow[] = study.lessons.map((lesson) => ({
    day: lesson.day,
    title: lesson.title,
    reference: stopReference(lesson),
    minutes: lesson.estimatedMinutes ?? 12,
    focus: lesson.focus,
  }));

  /** Books in lesson order, each with the chapters this route visits. */
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  const reading = books.map((book) => {
    const chapters = [
      ...new Set(study.lessons.filter((lesson) => lesson.book === book).map((lesson) => lesson.chapter)),
    ].sort((a, b) => a - b);
    return {
      book,
      chapters:
        chapters.length === 1
          ? String(chapters[0])
          : chapters[chapters.length - 1] - chapters[0] + 1 === chapters.length
            ? `${chapters[0]}-${chapters[chapters.length - 1]}`
            : chapters.join(', '),
    };
  });

  const about = (study.about && study.about.length > 0 ? study.about : [study.description]).slice(0, 2);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-none border-b border-gray-200 dark:border-border bg-white dark:bg-card">
        <div className="px-3 sm:px-5 pt-2">
          <ReviewBar />
        </div>

        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <Link
            href="/studies/versie-3"
            title="Terug naar alle routes"
            aria-label="Terug naar alle routes"
            className="group press inline-flex h-9 flex-none items-center gap-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card pl-2 pr-2.5 text-[12.5px] font-medium text-gray-500 dark:text-muted-foreground no-underline transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-foreground dark:hover:border-muted-foreground/40 dark:hover:bg-secondary"
          >
            <ArrowLeft
              size={14}
              aria-hidden
              className="flex-none transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none"
            />
            <span className="hidden sm:inline">Alle routes</span>
          </Link>

          <span aria-hidden className="hidden h-6 w-px flex-none bg-gray-200 dark:bg-border sm:block" />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="truncate text-[15px] font-bold leading-tight text-foreground sm:text-base">
              {study.title}
            </h1>
            <span
              className="hidden flex-none items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white sm:inline-flex"
              style={{ backgroundColor: TEAL }}
            >
              {TYPE_LABEL[study.type] ?? study.type}
            </span>
          </div>

          <p className="hidden flex-none text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums md:block">
            {ends.from} → {ends.to}
          </p>
        </div>
      </div>

      <RouteDetail
        studyId={study.id}
        title={study.title}
        art={art}
        kind={kind}
        sceneName={art.sceneName}
        about={about}
        totalLabel={formatStudyMinutes(estimateStudyMinutes(study))}
        avgMinutes={avgMinutesOf(study)}
        from={ends.from}
        to={ends.to}
        stops={stops}
        reading={reading}
        translations={versions.map((version) => ({
          id: version.id,
          name: version.name,
          language: version.language,
        }))}
        defaultTranslation={study.startVersion}
        suggestedRhythm={study.suggestedRhythm ?? 'dagelijks'}
        suggestedDepth={study.suggestedDepth ?? 'kort'}
        demoDone={Math.min(DEMO_STOPS_WALKED, Math.max(0, stops.length - 1))}
      />
    </div>
  );
}
