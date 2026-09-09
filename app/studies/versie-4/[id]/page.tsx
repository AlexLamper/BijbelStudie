import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../../lib/studyFlow';
import type { StudyRhythm } from '../../../../lib/data/curated-studies';
import StudyFlowVariantSwitcher from '../../../../components/study/StudyFlowVariantSwitcher';
import RustContents from '../../../../components/study/variants/rust/RustContents';
import {
  ACTION_CLASS,
  Eyebrow,
  QUIET_LINK_CLASS,
  StudyRule,
  TEAL,
} from '../../../../components/study/variants/rust/typography';

/**
 * Studieflow-ontwerp 4 - "Rust". Scherm 2 van 3: de studie.
 *
 * A title page and a table of contents. The banner is gone and nothing has
 * taken its place except a teal rule under the title: the argument of this
 * variant is that a study is a book, and a book announces itself in type.
 *
 * The prose gets a real measure (~68 characters), the facts are a definition
 * list in tabular numerals, and the lessons read as a contents page with
 * references and minutes. One action, once.
 *
 * A review URL, never indexed. Static data only - no session, no enrollment,
 * no database.
 */
export const metadata = {
  title: 'Studie - ontwerp 4 (Rust)',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** kind ("Evangelie", "Persoon") per study id, built once at module load. */
const KIND_BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry.kind]));

const RHYTHM_LABEL: Record<StudyRhythm, string> = {
  dagelijks: 'elke dag een les',
  'drie-per-week': 'drie lessen per week',
  wekelijks: 'een les per week',
  eigen: 'eigen dagen',
  vrij: 'geen vast ritme',
};

/** "Johannes 20:1-18" for a lesson, or "Johannes 20" without a range. */
function referenceOf(lesson: { book: string; chapter: number; verseRange?: string }): string {
  return `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`;
}

export default async function RustStudyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findAnyStudy(decodeURIComponent(id));
  if (!study) notFound();

  const minutes = estimateStudyMinutes(study);
  const kind = KIND_BY_ID.get(study.id) ?? study.type;

  /** Books in lesson order, each with the chapters this study visits. */
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  const readingPlan = books.map((book) => {
    const chapters = [
      ...new Set(study.lessons.filter((lesson) => lesson.book === book).map((l) => l.chapter)),
    ].sort((a, b) => a - b);
    const contiguous = chapters[chapters.length - 1] - chapters[0] + 1 === chapters.length;
    const range =
      chapters.length === 1
        ? String(chapters[0])
        : contiguous
          ? `${chapters[0]}–${chapters[chapters.length - 1]}`
          : chapters.join(', ');
    return `${book} ${range}`;
  });

  /**
   * DEMO DATA. The real page reads the enrollment and the completed lesson days
   * for the signed-in reader. A preview has neither, so: the study is treated as
   * started, the first lesson as finished, and the second as the one to resume.
   */
  const firstDay = study.lessons[0]?.day ?? 1;
  const demoCompleted = study.lessons.length > 1 ? [firstDay] : [];
  const demoCurrent = study.lessons[Math.min(1, study.lessons.length - 1)]?.day ?? 1;

  const description =
    study.about && study.about.length > 0 ? study.about.slice(0, 2) : [study.description];
  const lead = study.about && study.about.length > 0 ? study.description : null;

  return (
    <div className="px-6 py-8 sm:px-10 lg:py-14">
      <div className="mx-auto max-w-[76ch]">
        <StudyFlowVariantSwitcher className="mb-10" />

        <nav aria-label="Kruimelpad" className="mb-10">
          <Link href="/studies/versie-4" className={QUIET_LINK_CLASS}>
            Alle studies
          </Link>
        </nav>

        {/* The title page. */}
        <header className="max-w-[68ch]">
          <Eyebrow>{kind}</Eyebrow>
          <h1 className="mt-2.5 font-serif text-[34px] font-normal leading-[1.12] text-foreground sm:text-[42px]">
            {study.title}
          </h1>
          <StudyRule className="mt-6" />
          {lead && (
            <p className="mt-6 font-serif text-[19px] leading-[1.6] text-foreground/85">{lead}</p>
          )}
        </header>

        <div className="mt-8 max-w-[68ch] space-y-4">
          {description.map((paragraph, index) => (
            <p key={index} className="text-[15.5px] leading-[1.8] text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>

        {/* The facts you actually weigh, as a definition list. Labels left,
            values in tabular numerals so the column lines up. */}
        <dl className="mt-10 grid max-w-[68ch] grid-cols-[6.5rem_minmax(0,1fr)] gap-y-2.5 border-t border-border pt-6 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lessen
          </dt>
          <dd className="text-[14px] tabular-nums text-foreground">
            {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'}
          </dd>

          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tijd
          </dt>
          <dd className="text-[14px] tabular-nums text-foreground">
            ongeveer {formatStudyMinutes(minutes)} in totaal
          </dd>

          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Je leest
          </dt>
          <dd className="text-[14px] tabular-nums text-foreground">{readingPlan.join(' · ')}</dd>

          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ritme
          </dt>
          <dd className="text-[14px] text-foreground">
            {RHYTHM_LABEL[study.suggestedRhythm ?? 'dagelijks']}
            <span className="text-muted-foreground"> (voorstel, aan te passen)</span>
          </dd>
        </dl>

        {/* One action. It names the lesson it opens rather than saying "start". */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/studie/versie-4/${study.id}/${demoCurrent}`}
            className={ACTION_CLASS}
            style={{ backgroundColor: TEAL }}
          >
            Verder met les {demoCurrent}
          </Link>
          {firstDay !== demoCurrent && (
            <Link href={`/studie/versie-4/${study.id}/${firstDay}`} className={QUIET_LINK_CLASS}>
              Begin opnieuw bij les {firstDay}
            </Link>
          )}
        </div>

        {/* The contents. */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 pb-3">
            <h2 className="font-serif text-[19px] font-normal text-foreground">Inhoud</h2>
            <p className="text-[12px] tabular-nums text-muted-foreground">
              {demoCompleted.length} van {study.lessons.length} afgerond
            </p>
          </div>

          {study.lessons.length === 0 ? (
            <p className="border-t border-border pt-4 text-[14px] text-muted-foreground">
              Voor deze studie zijn nog geen lessen uitgewerkt.
            </p>
          ) : (
            <RustContents
              lessons={study.lessons.map((lesson) => ({
                day: lesson.day,
                title: lesson.title,
                reference: referenceOf(lesson),
                minutes: lesson.estimatedMinutes ?? 12,
              }))}
              hrefFor={(day) => `/studie/versie-4/${study.id}/${day}`}
              currentDay={demoCurrent}
              completedDays={demoCompleted}
            />
          )}
        </section>

        <p className="mt-16 text-[12px] leading-relaxed text-muted-foreground">
          Ontwerpvoorbeeld. De voortgang op deze pagina is voorbeelddata en hoort niet bij een
          account.
        </p>
      </div>
    </div>
  );
}
