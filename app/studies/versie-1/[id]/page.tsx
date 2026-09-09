import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import { getVersions } from '../../../../lib/local-data';
import AtlasPlate, {
  type AtlasEnrolment,
} from '../../../../components/study/variants/atlas/AtlasPlate';

/**
 * Ontwerp 1 van 4 - "Atlas". Het studiescherm.
 *
 * Beoordelings-URL naast /studies/[id]. De studie zelf komt uit de statische
 * catalogus; er wordt geen sessie gelezen, geen inschrijving opgehaald en geen
 * database aangeraakt. Waar de echte pagina jouw stand toont, staat hier een
 * vaste demostand (zie DEMO_ENROLMENTS).
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Het registerwoord per studie-id: "Wet", "Evangelie", "Persoon". */
const KIND_BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry.kind]));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const study = findAnyStudy(id);
  return {
    title: study ? `${study.title} — Atlas (ontwerp 1)` : 'Atlas (ontwerp 1)',
    robots: { index: false, follow: false },
  };
}

/**
 * DEMOGEGEVENS. Verzonnen en vast: welke studies "begonnen" zijn en hoever.
 * Een id dat hier niet in staat toont het scherm zoals iemand het ziet die nog
 * niet begon - dat is met opzet, zodat beide toestanden via de URL bereikbaar
 * zijn (/studies/versie-1/opstanding tegenover /studies/versie-1/boek-genesis).
 * Op de echte pagina komt dit uit StudyEnrollment en StudyProgress.
 */
const DEMO_ENROLMENTS: Record<string, AtlasEnrolment> = {
  opstanding: { currentDay: 2, completedDays: [1] },
  'boek-johannes': { currentDay: 9, completedDays: [1, 2, 3, 4, 5, 6, 7, 8] },
  bergrede: { currentDay: 3, completedDays: [1, 2] },
  daniel: { currentDay: 12, completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
};

export default async function AtlasStudyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findAnyStudy(id);
  if (!study) notFound();

  // De namenlijst van de vertalingen is statisch en staat los van een gebruiker.
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const translationName =
    versions.find((version) => version.id === study.startVersion)?.name ?? study.startVersion;

  return (
    <AtlasPlate
      study={study}
      kind={KIND_BY_ID.get(study.id) ?? study.type}
      translationName={translationName}
      enrolment={DEMO_ENROLMENTS[study.id] ?? null}
    />
  );
}
