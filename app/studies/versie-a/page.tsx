import type { Metadata } from 'next';

import ReviewStrip from '../../../components/study/variants/a/ReviewStrip';
import TrouwCatalogue, {
  type DemoProgress,
} from '../../../components/study/variants/a/TrouwCatalogue';

/**
 * Ontwerp A — "trouw" — scherm 1 van 3: de catalogus.
 *
 * EEN BEOORDELINGS-URL. Er wordt geen database, geen sessie en geen
 * inschrijving gelezen: alles op dit scherm komt uit `CATALOGUE_ENTRIES` plus de
 * demovoortgang hieronder. Daardoor kan een beoordelaar hem uitgelogd openen, en
 * kan niets hier de voortgang van een echte lezer raken.
 *
 * Nooit geïndexeerd: drie varianten van één pagina die om hetzelfde onderwerp
 * concurreren is precies de splitsing waar /studies/[id] al tegen beschermt.
 */
export const metadata: Metadata = {
  title: 'Studies — ontwerp A (trouw)',
  robots: { index: false, follow: false },
};

/**
 * DEMOGEGEVENS. Nergens vandaan gelezen en nooit teruggeschreven.
 *
 * De echte pagina vult dit uit `/api/v1/study-enrollments` en
 * `/api/v1/study-progress`. Hier staat het vast, zodat de catalogus met alle
 * drie de toestanden tegelijk beoordeeld kan worden — onaangeroerd, onderweg,
 * afgerond — en dat is precies wat een schermafbeelding van een leeg account
 * nooit laat zien.
 */
const DEMO: DemoProgress = {
  started: {
    opstanding: { done: 2, total: 3, resumeDay: 3 },
    'boek-johannes': { done: 7, total: 21, resumeDay: 8 },
    'boek-psalmen': { done: 12, total: 150, resumeDay: 13 },
  },
  completed: ['boek-ruth', 'geloof-in-storm'],
};

export default function TrouwCataloguePage() {
  return (
    <div className="bg-background">
      <ReviewStrip />
      <TrouwCatalogue demo={DEMO} />
    </div>
  );
}
