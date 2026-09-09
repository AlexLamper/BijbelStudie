import type { Metadata } from 'next';

import ReviewBar from '../../../components/study/variants/vensters/ReviewBar';
import VenstersOverview, {
  type DemoProgress,
} from '../../../components/study/variants/vensters/VenstersOverview';

/**
 * Design variant 2 of the study flow - "Vensters" - screen 1 of 3: the
 * catalogue.
 *
 * A REVIEW URL. It reads no database, no session and no enrollment: everything
 * on it comes from `CATALOGUE_ENTRIES` plus the demo progress below, so a
 * reviewer can open it signed out, and so nothing here can touch a real
 * reader's progress. Never indexed - four variants of one page competing for
 * the same subject is exactly the split /studies/[id] already guards against.
 */
export const metadata: Metadata = {
  title: 'Studies — ontwerp 2 (Vensters)',
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

export default function VenstersOverviewPage() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <ReviewBar />
      <VenstersOverview demo={DEMO} />
    </div>
  );
}
