import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, ListChecks } from 'lucide-react';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../lib/bookStudies';
import { sceneSpec } from '../../../../lib/levensboom/scenes';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../../lib/studyFlow';
import LessonFilmstrip from '../../../../components/study/variants/vensters/LessonFilmstrip';
import ReviewBar from '../../../../components/study/variants/vensters/ReviewBar';
import StudyTint from '../../../../components/study/variants/vensters/StudyTint';
import StudyWindow from '../../../../components/study/variants/vensters/StudyWindow';
import {
  ON_ART,
  ON_ART_FAINT,
  ON_ART_MUTED,
  SCRIM_HERO,
  SCRIM_TOP,
  studyArtFor,
} from '../../../../components/study/variants/vensters/studyHorizon';

const TEAL = '#0D9488';

/** The tint scope. One per page, so the id can be a constant. */
const SCOPE = 'vs-detail';

const TYPE_LABEL: Record<string, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Design variant 2 - "Vensters" - screen 2 of 3: the study itself.
 *
 * A REVIEW URL, and a server component with no database in it. The real
 * /studies/[id] reads the session, the enrollment and StudyProgress; this one
 * resolves the study from `findAnyStudy` - the same pure lookup the real
 * `findStudy` delegates to - and invents its progress below.
 *
 * THE IDEA: the window opens. The catalogue showed this study as one card-sized
 * window among many; here the same seeded horizon runs the full width of the
 * page, and its palette tints everything under it - the eyebrows, the rules, the
 * hover and focus colours, the primary button's hover. So the study has a
 * colour of its own without leaving slate and teal, and the teal stays where it
 * belongs: on the one action.
 *
 * The band is inline SVG, server-rendered, and it is the LCP element on
 * purpose - it paints with the HTML instead of waiting for hydration or for an
 * image request. No canvas anywhere near it.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const study = findAnyStudy(id);
  return {
    title: `${study ? study.title : 'Studie'} — ontwerp 2 (Vensters)`,
    robots: { index: false, follow: false },
  };
}

export default async function VenstersDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findAnyStudy(id);
  if (!study) notFound();

  const entry = CATALOGUE_ENTRIES.find((row) => row.study.id === study.id);
  const art = studyArtFor({ id: study.id, type: study.type, kind: entry?.kind });

  /**
   * DEMO DATA. Never read from anywhere, never written back.
   *
   * The real page derives all four of these from the reader's StudyEnrollment
   * and StudyProgress. Fixed here so the screen can be judged with a study that
   * is genuinely under way: two lessons behind you, one open, the rest ahead.
   */
  const DEMO_ENROLLED = true;
  const DEMO_COMPLETED_DAYS = study.lessons.slice(0, 2).map((lesson) => lesson.day);
  const DEMO_RESUME_DAY = study.lessons[2]?.day ?? study.lessons[0]?.day ?? 1;

  const minutes = estimateStudyMinutes(study);
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];

  /** Books in lesson order, each with the chapters this study visits. */
  const readingPlan = books.map((book) => {
    const chapters = [
      ...new Set(study.lessons.filter((lesson) => lesson.book === book).map((lesson) => lesson.chapter)),
    ].sort((a, b) => a - b);
    return {
      book,
      chapters:
        chapters.length === 1
          ? String(chapters[0])
          : chapters[chapters.length - 1] - chapters[0] + 1 === chapters.length
            ? `${chapters[0]}-${chapters[chapters.length - 1]}`
            : chapters.join(', '),
    };
  });

  const description = (study.about && study.about.length > 0 ? study.about : [study.description]).slice(0, 2);
  const pct = Math.round((DEMO_COMPLETED_DAYS.length / Math.max(1, study.lessons.length)) * 100);

  return (
    <div id={SCOPE} className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <StudyTint scopeId={SCOPE} palette={art.palette} />
      <ReviewBar />

      {/* The band. Full bleed, and the tallest thing on the page - it is the
          study's identity, not an illustration beside it. */}
      <header>
        <StudyWindow
          art={art}
          className="aspect-[4/3] w-full sm:aspect-[16/7] lg:aspect-[24/7] xl:aspect-[32/8]"
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-1/3" style={{ backgroundImage: SCRIM_TOP }} />
          <span aria-hidden className="absolute inset-0" style={{ backgroundImage: SCRIM_HERO }} />

          <div className="absolute inset-x-0 top-0 p-4 sm:p-6 lg:p-8">
            <Link
              href="/studies/versie-2"
              className="group vs-focus-art inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium no-underline backdrop-blur transition-colors"
              style={{
                color: ON_ART,
                borderColor: 'rgba(255,255,255,0.32)',
                backgroundColor: 'rgba(2,6,23,0.42)',
              }}
            >
              <ArrowLeft
                size={14}
                aria-hidden
                className="flex-none transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              Alle vensters
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-12">
            <p
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ backgroundColor: TEAL, color: '#ffffff' }}
            >
              {TYPE_LABEL[study.type] ?? study.type}
            </p>
            <h1
              className="mt-3 max-w-4xl text-[28px] font-bold leading-tight sm:text-[40px] lg:text-[52px]"
              style={{ color: ON_ART }}
            >
              {study.title}
            </h1>
            <p className="mt-3 text-[12.5px] tabular-nums sm:text-[13.5px]" style={{ color: ON_ART_MUTED }}>
              {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'} · ±{' '}
              {formatStudyMinutes(minutes)} in totaal · {books.slice(0, 3).join(', ')}
              {books.length > 3 ? ` en ${books.length - 3} meer` : ''}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: ON_ART_FAINT }}>
              {entry?.kind ?? TYPE_LABEL[study.type]} · uitzicht: {sceneSpec(art.scene).name}
            </p>
          </div>
        </StudyWindow>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8 xl:px-12">
        <div className="grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-14">
          <div className="min-w-0">
            <div aria-hidden className="vs-rule h-px w-16" />
            <h2 className="mt-4 text-[17px] font-bold text-gray-900 dark:text-foreground">
              Waar gaat deze studie over?
            </h2>
            <div className="mt-3 max-w-[62ch] space-y-4">
              {description.map((paragraph, index) => (
                <p key={index} className="text-[15.5px] leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wider vs-ink">Wat je leest</h3>
            <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-gray-500 dark:text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <ListChecks size={13} aria-hidden className="flex-none" style={{ color: TEAL }} />
                {study.lessons.length} {study.lessons.length === 1 ? 'les' : 'lessen'}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Clock size={13} aria-hidden className="flex-none" style={{ color: TEAL }} />± {formatStudyMinutes(minutes)} totaal
              </li>
              {readingPlan.map((plan) => (
                <li key={plan.book} className="inline-flex items-center gap-1.5">
                  <BookOpen size={13} aria-hidden className="flex-none" style={{ color: TEAL }} />
                  {plan.book} {plan.chapters}
                </li>
              ))}
            </ul>

            <div className="vs-wash vs-edge mt-8 max-w-[62ch] rounded-xl border p-4">
              <p className="text-[13px] leading-relaxed text-foreground/80">
                Elke les loopt dezelfde route: eerst de context, dan het gedeelte zelf, dan de uitleg,
                dan je eigen antwoord en tot slot een korte toetsing. Je kunt op elk moment stoppen —
                de les onthoudt waar je gebleven was.
              </p>
            </div>
          </div>

          <aside className="min-w-0">
            <LessonFilmstrip
              studyId={study.id}
              art={art}
              lessons={study.lessons.map((lesson) => ({
                day: lesson.day,
                title: lesson.title,
                reference: `${lesson.book} ${lesson.chapter}${lesson.verseRange ? `:${lesson.verseRange}` : ''}`,
                minutes: lesson.estimatedMinutes ?? 12,
                focus: lesson.focus,
              }))}
              completedDays={DEMO_COMPLETED_DAYS}
              currentDay={DEMO_ENROLLED ? DEMO_RESUME_DAY : null}
              enrolled={DEMO_ENROLLED}
            />
          </aside>
        </div>
      </div>

      {/* The one action, held at the foot of the scroller so it is reachable
          from anywhere on the page - a 150-lesson study is a long scroll. */}
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-background/95 backdrop-blur dark:border-border">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 xl:px-12">
          <div className="min-w-[200px] flex-1">
            <p className="text-[12px] font-medium text-gray-500 dark:text-muted-foreground tabular-nums">
              {DEMO_COMPLETED_DAYS.length} van {study.lessons.length} lessen afgerond
            </p>
            <div
              className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100 dark:bg-secondary"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Voortgang in deze studie"
            >
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>

          <Link
            href={`/studie/versie-2/${encodeURIComponent(study.id)}/${DEMO_RESUME_DAY}`}
            className="vs-primary vs-focus press inline-flex h-11 flex-none items-center rounded-xl px-6 text-[14px] font-semibold text-white no-underline transition-colors"
          >
            {DEMO_ENROLLED ? `Verder met les ${DEMO_RESUME_DAY}` : 'Start deze studie'}
          </Link>
        </div>
      </div>
    </div>
  );
}
