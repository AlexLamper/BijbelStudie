import type { Metadata } from 'next';

import CatalogueB, { type DemoProgress } from '../../../components/study/variants/b/CatalogueB';
import ReviewStrip from '../../../components/study/variants/b/ReviewStrip';

/**
 * Ontwerp B - "Dichter" - scherm 1 van 3: de catalogus.
 *
 * Een BEOORDELINGS-URL. Er wordt geen database, geen sessie en geen
 * inschrijving gelezen: alles op dit scherm komt uit `CATALOGUE_ENTRIES` plus de
 * demostand hieronder. Een beoordelaar kan hem dus uitgelogd openen, en niets
 * op deze pagina kan de voortgang van een echte lezer aanraken.
 *
 * Nooit geïndexeerd: drie varianten van één pagina die om hetzelfde onderwerp
 * concurreren is precies waar /studies/[id] al tegen beschermt.
 */
export const metadata: Metadata = {
  title: 'Studies - ontwerp B (Dichter)',
  robots: { index: false, follow: false },
};

/**
 * DEMOGEGEVENS. Nergens vandaan gelezen en nooit teruggeschreven.
 *
 * De echte pagina vult dit uit `/api/v1/study-enrollments` en
 * `/api/v1/study-progress`. Hier staat het vast, zodat de catalogus te
 * beoordelen is met alle drie de toestanden tegelijk in beeld - onaangeraakt,
 * onderweg en afgerond. Dat is juist het verschil dat dit ontwerp op één blik
 * leesbaar wil maken, en een screenshot van een leeg account laat het nooit
 * zien.
 */
const DEMO: DemoProgress = {
  started: {
    opstanding: { done: 2, total: 3, resumeDay: 3 },
    'boek-johannes': { done: 7, total: 21, resumeDay: 8 },
    'boek-psalmen': { done: 12, total: 150, resumeDay: 13 },
    bergrede: { done: 1, total: 4, resumeDay: 2 },
  },
  completed: ['boek-ruth', 'geloof-in-storm'],
};

export default function CatalogueBPage() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <ReviewStrip />
      <CatalogueB demo={DEMO} />
    </div>
  );
}
