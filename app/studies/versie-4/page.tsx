import Link from 'next/link';

import { CATALOGUE_ENTRIES } from '../../../lib/bookStudies';
import StudyFlowVariantSwitcher from '../../../components/study/StudyFlowVariantSwitcher';
import RustCatalogue, {
  type CatalogueDemoState,
  type CatalogueRow,
} from '../../../components/study/variants/rust/RustCatalogue';
import { Eyebrow, StudyRule } from '../../../components/study/variants/rust/typography';

/**
 * Studieflow-ontwerp 4 - "Rust". Scherm 1 van 3: het overzicht.
 *
 * A review URL, never indexed. The control case against the illustrated
 * variants: no banner, no generated scene, no card chrome. The catalogue is set
 * as a register - index numeral, title, subject, facts - and the browsing aids
 * are typographic rather than a pill row.
 *
 * Static data only. `CATALOGUE_ENTRIES` is built at module load from the
 * authored studies plus the 66 generated book studies; nothing here reads a
 * session, an enrollment or a database.
 */
export const metadata = {
  title: 'Studies - ontwerp 4 (Rust)',
  robots: { index: false, follow: false },
};

/** The rows, trimmed on the server so the client bundle carries no prose it
 *  cannot use. Search is matched against a haystack lowercased once, here. */
const ROWS: CatalogueRow[] = CATALOGUE_ENTRIES.map(
  ({ study, book, kind, category, lessonCount, avgMinutes }) => ({
    id: study.id,
    title: study.title,
    description: study.description,
    kind,
    category,
    lessons: lessonCount,
    minutes: avgMinutes,
    haystack: (book
      ? `${study.title} ${book.name} ${book.genre} ${study.description}`
      : `${study.title} ${study.description} ${study.lessons.map((lesson) => lesson.book).join(' ')}`
    ).toLowerCase(),
  }),
);

/**
 * DEMO DATA. The real page reads enrollments and completions from
 * /api/v1/study-enrollments and /api/v1/study-progress. A design preview has no
 * user, so this is a fixed, invented state: two studies underway and one
 * finished, chosen so the three row states are all visible in the register.
 */
const DEMO: CatalogueDemoState = {
  inProgress: { opstanding: 1, 'boek-johannes': 6 },
  completed: ['geloof-in-storm'],
};

export default function RustStudiesOverviewPage() {
  return (
    <div className="px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
      <StudyFlowVariantSwitcher className="mb-10" />

      <header className="max-w-[60ch]">
        <Eyebrow>Bijbelstudie</Eyebrow>
        <h1 className="mt-2.5 font-serif text-[32px] font-normal leading-[1.15] text-foreground sm:text-[38px]">
          Alle studies
        </h1>
        <StudyRule className="mt-5" />
        <p className="mt-5 text-[15.5px] leading-[1.75] text-muted-foreground">
          Elk bijbelboek heeft er een, en daarnaast staan hier studies over personen, over
          thema&rsquo;s en over losse gedeelten. Kies er een en werk hem les voor les door &mdash;
          lezen, uitleg, een vraag om over door te denken.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Liever eerst rondkijken?{' '}
          <Link
            href="/studies/versie-4/opstanding"
            className="text-foreground underline underline-offset-4 decoration-1"
          >
            De opstanding van Jezus
          </Link>{' '}
          is drie lessen lang en een goed begin.
        </p>
      </header>

      <div className="mt-12">
        <RustCatalogue rows={ROWS} demo={DEMO} />
      </div>

      <p className="mt-16 max-w-[60ch] text-[12px] leading-relaxed text-muted-foreground">
        Ontwerpvoorbeeld. Voortgang op deze pagina is voorbeelddata en hoort niet bij een account.
      </p>
    </div>
  );
}
