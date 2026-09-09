import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import { getVersions } from '../../../../lib/local-data';
import TrouwPlate, {
  type TrouwEnrolment,
} from '../../../../components/study/variants/a/TrouwPlate';

/**
 * Ontwerp A — "trouw" — scherm 2 van 3: de studie zelf.
 *
 * EEN BEOORDELINGS-URL, en een server component zonder database erin. De echte
 * /studies/[id] leest de sessie, de inschrijving en StudyProgress; deze pagina
 * lost de studie op met `findAnyStudy` — dezelfde pure lookup waar de echte
 * `findStudy` naar doordelegeert — en verzint zijn stand hieronder.
 *
 * Nooit geïndexeerd: drie ontwerpen van één pagina mogen niet met het echte
 * /studies/[id] om hetzelfde onderwerp concurreren.
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
    title: study ? `${study.title} — ontwerp A (trouw)` : 'Studie — ontwerp A (trouw)',
    robots: { index: false, follow: false },
  };
}

/**
 * DEMOGEGEVENS. Verzonnen en vast: welke studies "begonnen" zijn en hoever.
 *
 * Een id dat hier niet in staat toont het scherm zoals iemand het ziet die nog
 * niet begon — met opzet, zodat beide toestanden via de URL bereikbaar zijn
 * (/studies/versie-a/opstanding tegenover /studies/versie-a/boek-genesis). Op de
 * echte pagina komt dit uit StudyEnrollment en StudyProgress; hier wordt er niets
 * gelezen en niets geschreven.
 */
const DEMO_ENROLMENTS: Record<string, TrouwEnrolment> = {
  opstanding: { currentDay: 3, completedDays: [1, 2] },
  'boek-johannes': { currentDay: 8, completedDays: [1, 2, 3, 4, 5, 6, 7] },
  bergrede: { currentDay: 3, completedDays: [1, 2] },
  daniel: { currentDay: 12, completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
};

export default async function TrouwStudyPage({ params }: PageProps) {
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
    <TrouwPlate
      study={study}
      kind={KIND_BY_ID.get(study.id) ?? study.type}
      translationName={translationName}
      enrolment={DEMO_ENROLMENTS[study.id] ?? null}
    />
  );
}
