import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import { getVersions } from '../../../../lib/local-data';
import StudyPlateB, {
  type DemoEnrolment,
} from '../../../../components/study/variants/b/StudyPlateB';

/**
 * Ontwerp B - "Dichter" - scherm 2 van 3: het studiescherm.
 *
 * Een BEOORDELINGS-URL naast /studies/[id]. De studie komt uit de statische
 * catalogus via `findAnyStudy` - dezelfde zuivere opzoeking waar de echte
 * `findStudy` naartoe delegeert. Er wordt geen sessie gelezen, geen inschrijving
 * opgehaald en geen database aangeraakt; waar de echte pagina jouw stand toont,
 * staat hier een vaste demostand.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Het rubriekwoord per studie-id: "Wet", "Evangelie", "Persoon". */
const KIND_BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry.kind]));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const study = findAnyStudy(id);
  return {
    title: `${study ? study.title : 'Studie'} - ontwerp B (Dichter)`,
    robots: { index: false, follow: false },
  };
}

/**
 * DEMOGEGEVENS. Verzonnen, vast, nergens vandaan gelezen en nooit
 * teruggeschreven.
 *
 * Welke studies "begonnen" zijn en hoever. Een id dat hier niet in staat toont
 * het scherm zoals iemand het ziet die nog niet begon - met opzet, zodat beide
 * toestanden via de URL bereikbaar zijn (/studies/versie-b/opstanding tegenover
 * /studies/versie-b/boek-genesis). Op de echte pagina komt dit uit
 * StudyEnrollment en StudyProgress.
 */
const DEMO_ENROLMENTS: Record<string, DemoEnrolment> = {
  opstanding: { currentDay: 3, completedDays: [1, 2] },
  'boek-johannes': { currentDay: 8, completedDays: [1, 2, 3, 4, 5, 6, 7] },
  'boek-psalmen': { currentDay: 13, completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  bergrede: { currentDay: 2, completedDays: [1] },
  'boek-ruth': { currentDay: 4, completedDays: [1, 2, 3, 4] },
};

export default async function StudyPlateBPage({ params }: PageProps) {
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
    <StudyPlateB
      study={study}
      kind={KIND_BY_ID.get(study.id) ?? study.type}
      translationName={translationName}
      enrolment={DEMO_ENROLMENTS[study.id] ?? null}
    />
  );
}
