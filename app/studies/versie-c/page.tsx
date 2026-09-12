import type { Metadata } from 'next';

import OverviewC, { type DemoProgress } from '../../../components/study/variants/c/OverviewC';
import ReviewStrip from '../../../components/study/variants/c/ReviewStrip';

/**
 * Ontwerp C - "Doorlopend" - screen 1 of 3: the catalogue.
 *
 * A REVIEW URL. It reads no database, no session and no enrollment: everything
 * on it comes from `CATALOGUE_ENTRIES` plus the demo progress below, so a
 * reviewer can open it signed out and nothing here can touch a real reader's
 * progress. Never indexed - three variants of one page competing for the same
 * subject is exactly the split /studies/[id] already guards against.
 *
 * The static `versie-c` segment wins over the sibling `[id]`, so this resolves
 * here while every real study URL still resolves to the real page.
 */
export const metadata: Metadata = {
  title: 'Studies - ontwerp C (Doorlopend)',
  robots: { index: false, follow: false },
};

/**
 * DEMO DATA. Not read from anywhere and never written back.
 *
 * The real page fills this from `/api/v1/study-enrollments` and
 * `/api/v1/study-progress`. It is fixed here so the catalogue can be judged
 * with all three states on screen at once - untouched, under way, finished -
 * which is the thing a screenshot of an empty account never shows.
 */
const DEMO: DemoProgress = {
  started: {
    opstanding: { done: 2, total: 3, resumeDay: 3 },
    'boek-johannes': { done: 7, total: 21, resumeDay: 8 },
    'boek-psalmen': { done: 12, total: 150, resumeDay: 13 },
  },
  completed: ['boek-ruth', 'geloof-in-storm'],
};

export default function DoorlopendOverviewPage() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <ReviewStrip />
      <OverviewC demo={DEMO} />
    </div>
  );
}
