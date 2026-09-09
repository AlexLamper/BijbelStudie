import type { Metadata } from 'next';

import AtlasIndex, {
  type AtlasProgressMap,
} from '../../../components/study/variants/atlas/AtlasIndex';

/**
 * Ontwerp 1 van 4 - "Atlas". Het overzichtsscherm.
 *
 * Een beoordelings-URL naast /studies, niet de echte catalogus. Er wordt hier
 * geen database aangeraakt: de regels komen uit `CATALOGUE_ENTRIES`, de
 * voortgang uit de vaste demogegevens hieronder. Zodra een richting gekozen is
 * verdwijnen deze routes samen met StudyFlowVariantSwitcher.
 */

export const metadata: Metadata = {
  title: 'Atlas — register van de studies (ontwerp 1)',
  robots: { index: false, follow: false },
};

/**
 * DEMOGEGEVENS. Verzonnen, vast, en met opzet nooit uit de database gelezen -
 * dit scherm is een ontwerpvoorbeeld en mag geen enkele echte voortgang tonen
 * of aanraken. Op de echte /studies komt dit uit /api/v1/study-enrollments.
 */
const DEMO_PROGRESS: AtlasProgressMap = {
  opstanding: { done: 1 },
  'boek-johannes': { done: 8 },
  'boek-genesis': { done: 3 },
  bergrede: { done: 2 },
  daniel: { done: 12, completed: true },
  'boek-ruth': { done: 4, completed: true },
  abraham: { done: 8, completed: true },
};

export default function AtlasStudiesPage() {
  return <AtlasIndex progress={DEMO_PROGRESS} />;
}
