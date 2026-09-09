import type { Metadata } from 'next';

import { CATALOGUE_ENTRIES } from '../../../lib/bookStudies';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../lib/studyFlow';
import ReviewBar from '../../../components/study/variants/weg/ReviewBar';
import RoutePlanner from '../../../components/study/variants/weg/RoutePlanner';
import {
  routeArtFor,
  routeBand,
  routeEnds,
  type RouteRow,
} from '../../../components/study/variants/weg/routeArt';

/**
 * Ontwerp 3 - "Weg". Het overzicht: routes om uit te kiezen.
 *
 * A review URL, never indexed. It inherits `app/studies/layout.tsx`, so it sits
 * inside the app shell exactly like the real /studies does.
 *
 * The premise of this variant: a study is a road you walk, and this screen is
 * choosing which one. So the catalogue is not a wall of thumbnails - a study is
 * described by the shape of its journey (how many stops, what terrain, where it
 * sets out and where it comes out) and the picture on each card is that route
 * itself, drawn from the seed of the study's own id.
 *
 * Everything below is static: `CATALOGUE_ENTRIES`, `estimateStudyMinutes`, and
 * a seeded pure function for the art. No database, no session, no fetch - the
 * seventy-seven rows and their pictures are built once on the server and handed
 * to one client island as plain data, which also keeps the sixty-six books'
 * prose out of the browser bundle.
 */

export const metadata: Metadata = {
  title: 'Ontwerp 3 — Weg · Kies je route',
  robots: { index: false, follow: false },
};

/**
 * DEMO DATA. Invented, fixed, and never read from the database - this page must
 * not touch a reader's real progress. Two routes are underway and one has been
 * walked end to end, which is what the "Onderweg" and "Uitgelopen" sections
 * exist to show. `done` is how many stops are behind you.
 */
const DEMO_JOURNEYS: Record<string, { done: number; completed?: boolean }> = {
  opstanding: { done: 1 },
  'boek-lukas': { done: 7 },
  mozes: { done: 10, completed: true },
};

const ROWS: RouteRow[] = CATALOGUE_ENTRIES.map(({ study, book, kind, category, lessonCount }, index) => {
  const ends = routeEnds(study);
  const demo = DEMO_JOURNEYS[study.id];

  return {
    id: study.id,
    title: study.title,
    description: study.description,
    kind,
    category,
    lessonCount,
    totalLabel: formatStudyMinutes(estimateStudyMinutes(study)),
    from: ends.from,
    to: ends.to,
    band: routeBand(lessonCount),
    order: index,
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
    ).toLowerCase(),
    art: routeArtFor({ id: study.id, type: study.type, kind }),
    walked: demo ? { done: demo.done, completed: demo.completed === true } : null,
  };
});

const UNDERWAY = Object.values(DEMO_JOURNEYS).filter((entry) => !entry.completed).length;

export default function WegOverviewPage() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="w-full px-5 sm:px-8 xl:px-10 py-6">
        <ReviewBar className="mb-6" />

        <header className="max-w-[68ch]">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: '#0D9488' }}
          >
            {ROWS.length} routes door de Bijbel
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight text-gray-900 dark:text-foreground">
            Welke weg loop je hierna?
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
            Elke studie is een route met stops. Kies er een op lengte, op terrein of op waar hij
            begint — en zie meteen hoeveel ervan je al gelopen hebt.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-400 dark:text-muted-foreground">
            Ontwerpvoorbeeld. De voortgang op deze pagina ({UNDERWAY} routes onderweg) is verzonnen
            en staat los van je eigen voortgang.
          </p>
        </header>

        <RoutePlanner rows={ROWS} />

        <div className="h-16" aria-hidden />
      </div>
    </div>
  );
}
