import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, BookOpen, Clock, Layers, TrendingUp, type LucideIcon } from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../lib/studyFlow';
import { BOOK_STUDY_PREFIX, isBookStudyId } from '../../../lib/bookStudies';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import AppShell from '../../../components/shell/AppShell';
import { Card } from '../../../components/kit/primitives';
import { bannerGradient } from '../../../components/kit/primitives';
import { studyPhotoFor } from '../../../lib/studyPhotos';
import StudyArtwork from '../StudyArtwork';
import StudySetupProvider, { StudyActionBar, StudySettingsButton } from './StudyOnboardingForm';
import LessonList from './LessonList';
import { chapterStudyPath, findBook, resolveChapterStudy } from '../../../lib/chapterStudy';
import { curatedStudies, type CuratedStudy } from '../../../lib/data/curated-studies';
import { JsonLd } from '../../../components/seo/JsonLd';
import { absoluteUrl } from '../../../lib/seo/constants';
import { breadcrumbNode, courseNode, graph, webPageNode } from '../../../lib/seo/structuredData';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Rendered per request, not prerendered.
 *
 * The page reads the session to show whether you are already enrolled and where
 * to resume. With `generateStaticParams` alone Next happily prerendered it at
 * build time - when there is no session - and a signed-in visitor would then be
 * served that anonymous HTML, permanently missing their own progress.
 *
 * SEO is unaffected: a crawler still receives fully server-rendered HTML with
 * the description and the lesson list. Ten pages do not need caching.
 */
export const dynamic = 'force-dynamic';

/**
 * Per-study metadata.
 *
 * `generatePageMetadata` reads a static map keyed by page name, which cannot
 * express a canonical that varies per study - and two pages claiming the same
 * canonical is how Google folds them into one.
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const study = findStudy(id);
  if (!study) return buildMetadata({ title: 'Studie', description: '', path: '/studies', indexable: false });

  return buildMetadata({
    title: study.title,
    description: study.description,
    path: `/studies/${study.id}`,
    type: 'article',
    ogEyebrow: 'Bijbelstudie',
    /**
     * Generated book studies are not indexed.
     *
     * Their subject already has a public, hand-written page at
     * /bijbelboeken/[slug]; two URLs competing for "Genesis bestuderen" splits
     * the signal and lets Google pick the thinner one. Authored studies have
     * content that exists nowhere else, so they stay indexable.
     */
    indexable: !isBookStudyId(study.id),
  });
}

const TYPE_LABEL: Record<string, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
};

/**
 * Study detail (design_handoff_web/PAGES-STUDIE-EN-LES.md §10).
 *
 * The ordinary AppShell with `active="studies"` and the study's own name as the
 * title, then one column: a 142 px banner carrying the breadcrumb, the title and
 * three pills; four figures; and below them the pitch and the lessons beside a
 * 326 px rail.
 *
 * Public and indexable: this is where someone decides whether a study is for
 * them, so it must be reachable without an account and crawlable. Only the
 * settings form needs a session, and it sends anonymous visitors to sign in at
 * the moment they press start.
 *
 * The state behind the settings dialog and the start button is still one
 * object, held by StudySetupProvider above the whole page, and every query this
 * page makes is the one it already made.
 */
export default async function StudyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findStudy(id);
  if (!study) notFound();

  const session = await getServerSession(authOptions);
  /**
   * Signed in or not decides how the study STARTS, not whether the page has
   * chrome. The header and the rail render for everyone (both are guest-aware
   * now - see components/auth/GuestGate.tsx). A guest may open any lesson and
   * step through it; only saving progress at the end asks for an account, so
   * the start button for a guest goes straight to lesson one instead of
   * creating an enrollment, and the lesson rows open rather than lock.
   */
  const signedIn = Boolean(session?.user?.email);

  let enrolled = false;
  let resumeDay = study.lessons[0]?.day ?? 1;
  let resumeStep: string | null = null;
  let completedDays: number[] = [];
  let settings: { rhythm?: string; depth?: string; translation?: string | null } = {};
  let savedStudy = false;

  if (session?.user?.email) {
    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email })
      .select('_id savedStudies')
      .lean<{ _id: unknown; savedStudies?: string[] | null }>();

    if (user) {
      const userId = String(user._id);
      savedStudy = Array.isArray(user.savedStudies) && user.savedStudies.includes(study.id);
      const enrollment = await getEnrollment(userId, study.id);
      if (enrollment) {
        enrolled = true;
        resumeDay = enrollment.currentLessonDay;
        resumeStep = enrollment.currentStep === 'done' ? null : enrollment.currentStep;
        settings = {
          rhythm: enrollment.rhythm,
          depth: enrollment.depth,
          translation: enrollment.translation ?? null,
        };
      }
      const done = (await StudyProgress.distinct('lessonDay', {
        userId,
        studyId: study.id,
      })) as (number | null)[];
      completedDays = done.filter((day): day is number => day != null);
    }
  }

  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );

  // `language` is carried into the picker so it can group the Dutch translations
  // ahead of the rest: the manifest interleaves nl, en and de, and this is a
  // Dutch-language site where the nl ones are the answer nearly every time.
  const translations = versions.map((version) => ({
    id: version.id,
    name: version.name,
    language: version.language,
  }));
  const minutes = estimateStudyMinutes(study);
  const hasPhoto = studyPhotoFor(study.id) !== null;
  const resumeHref = `/studie/${study.id}/${resumeDay}${resumeStep ? `?stap=${resumeStep}` : ''}`;
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];
  const lessonsTotal = study.lessons.length;
  const lessonsDone = completedDays.length;
  const pct = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  /**
   * The written pitch, at most two paragraphs.
   *
   * `about` is authored hook first, shape of the book second, and mechanics
   * third ("je leest het hoofdstuk voor hoofdstuk, in volgorde") - and the
   * mechanics are already answered by the lesson list sitting next to it. Two
   * paragraphs is what someone reads before deciding; the third they skim.
   *
   * The one-line `study.description` is not in here any more: it is the lead
   * under the title, so repeating it in the panel below said the same sentence
   * twice. A study with no `about` simply has no panel.
   */
  const about = (study.about ?? []).slice(0, 2);
  /** "Wat ga je leren?" - under the pitch, in the same card. */
  const outcomes = study.outcomes ?? [];
  const related = relatedStudies(study);

  /**
   * Structured data for the authored studies only: the generated book
   * studies are noindex (see generateMetadata). The Course node carries the
   * same @id, url and image as its copy in the /studies graph, so Google reads
   * both as one course.
   */
  const path = `/studies/${study.id}`;
  const url = absoluteUrl(path);
  const studyGraph = isBookStudyId(study.id)
    ? null
    : graph(
        webPageNode({
          path,
          name: study.title,
          description: study.description,
          breadcrumbId: `${url}#breadcrumb`,
        }),
        breadcrumbNode(
          [
            { name: 'Home', path: '/' },
            { name: 'Studies', path: '/studies' },
            { name: study.title, path },
          ],
          url,
        ),
        courseNode({
          name: study.title,
          description: study.description,
          path,
          lessonCount: study.lessons.length,
          image: `/og?${new URLSearchParams({ title: study.title, subtitle: study.description }).toString()}`,
          anchor: study.id,
        }),
      );

  /** Books in lesson order, each with the chapters this study visits. */
  const readingPlan = books.map((book) => {
    const chapters = [
      ...new Set(study.lessons.filter((l) => l.book === book).map((l) => l.chapter)),
    ].sort((a, b) => a - b);
    return {
      book,
      chapters:
        chapters.length === 1
          ? String(chapters[0])
          : // A contiguous run reads as a range; anything else stays a list.
            chapters[chapters.length - 1] - chapters[0] + 1 === chapters.length
            ? `${chapters[0]}-${chapters[chapters.length - 1]}`
            : chapters.join(', '),
    };
  });

  return (
    /* The provider wraps the page rather than sitting in it: the settings
       dialog and the start button read and write one piece of state, and
       nothing else can contain both. It renders a fragment plus its dialog, so
       the layout below is unaffected - and this markup stays server-rendered,
       which is what keeps the page crawlable. */
    <StudySetupProvider
      studyId={study.id}
      studyTitle={study.title}
      initialSaved={savedStudy}
      translations={translations}
      defaultTranslation={settings.translation ?? study.startVersion}
      suggestedRhythm={(settings.rhythm as never) ?? study.suggestedRhythm ?? 'dagelijks'}
      suggestedDepth={(settings.depth as never) ?? study.suggestedDepth ?? 'kort'}
      enrolled={enrolled}
      guest={!signedIn}
      resumeHref={resumeHref}
      resumeDay={resumeDay}
      lessonsTotal={lessonsTotal}
      lessonsCompleted={lessonsDone}
    >
      <AppShell title={study.title} active="/studies" ownHeading>
        {studyGraph && <JsonLd data={studyGraph} />}
        <div className="flex min-h-full flex-col gap-4">
          {/* Back to the catalogue. A real link rather than history.back():
              plenty of visitors land here straight from search or a shared
              link, with nothing behind them to go back to. The arrow names the
              direction of travel. */}
          <Link
            href="/studies"
            className="-mb-1 inline-flex min-h-9 flex-none items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-teal no-underline outline-none transition-colors hover:text-teal-dark focus-visible:ring-2 focus-visible:ring-teal dark:text-teal-400 dark:hover:text-teal-300"
          >
            <ArrowLeft size={15} strokeWidth={2.2} aria-hidden />
            Terug naar studies
          </Link>

          {/* The banner. The study's own cover - the same `StudyArtwork` its
              card on /studies shows (photo from lib/studyPhotos.ts over its
              seeded horizon) - under a slate wash that deepens towards the foot,
              where the title sits. A study without a photo keeps the gradient
              plate it always had. */}
          <div
            className="relative flex h-[142px] flex-none flex-col justify-end overflow-hidden rounded-card px-[24px] pb-[18px] pt-[32px] max-md:h-auto max-md:min-h-[142px] max-md:px-[18px] max-md:pr-[52px]"
            style={{ background: bannerGradient(study.id) }}
          >
            {hasPhoto && (
              <>
                <div className="pointer-events-none absolute inset-0">
                  <StudyArtwork
                    id={study.id}
                    kind={study.type}
                    ratio={5}
                    size="banner"
                    quiet
                    className="h-full w-full"
                  />
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(180deg, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.34) 40%, rgba(15,23,42,0.8) 100%)',
                  }}
                />
              </>
            )}
            <StudySettingsButton className="absolute right-[10px] top-[10px] z-10" />
            <div className="relative mt-[10px] flex items-center gap-1.5 text-[11.5px] text-white/70 max-md:min-w-0">
              <Link href="/studies" className="text-white/70 no-underline hover:text-white max-md:flex-none">
                Studies
              </Link>
              <span aria-hidden>&rsaquo;</span>
              <span className="font-semibold text-white max-md:min-w-0 max-md:truncate">{study.title}</span>
            </div>
            <h1 className="relative mt-1.5 text-[25px] font-bold leading-none tracking-[-0.5px] text-white max-md:text-[22px] max-md:leading-tight">
              {study.title}
            </h1>
            <div className="relative mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-[9px] py-[3px] text-[11px] font-semibold text-teal-dark">
                {TYPE_LABEL[study.type] ?? study.type}
              </span>
              <span
                className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold text-white"
                style={{ backgroundColor: 'rgba(17,24,39,.5)' }}
              >
                {lessonsTotal} {lessonsTotal === 1 ? 'les' : 'lessen'} &middot; {formatStudyMinutes(minutes)}
              </span>
              {books.length > 0 && (
                <span
                  className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold text-white"
                  style={{ backgroundColor: 'rgba(17,24,39,.5)' }}
                >
                  {books.length === 1 ? books[0] : `${books.length} bijbelboeken`}
                </span>
              )}
            </div>
          </div>

          {/* Four figures, with the unit beside the value rather than under it. */}
          <div className="grid flex-none grid-cols-2 gap-[10px] md:flex md:gap-[14px]">
            <DetailStat icon={Layers} label="Lessen" value={`${lessonsTotal}`} unit={lessonsTotal === 1 ? 'les' : 'lessen'} />
            <DetailStat icon={Clock} label="Tijd" value={formatStudyMinutes(minutes)} unit="totaal" />
            <DetailStat
              icon={BookOpen}
              label="Bijbelboeken"
              value={`${books.length}`}
              unit={books.length === 1 ? 'boek' : 'boeken'}
            />
            <DetailStat icon={TrendingUp} label="Voortgang" value={`${pct} %`} unit={`${lessonsDone} van ${lessonsTotal}`} />
          </div>

          <div className="flex min-h-0 flex-1 gap-5 max-md:flex-col max-md:gap-4">
            {/* The pitch, then the lessons. */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {(about.length > 0 || outcomes.length > 0) && (
                <Card className="flex-none px-[21px] py-[19px]">
                  {about.length > 0 && (
                    <>
                      <h2 className="text-[16px] font-bold text-ink">Waar gaat deze studie over?</h2>
                      <div className="mt-[9px] space-y-3">
                        {about.map((paragraph, index) => (
                          <p key={index} className="text-[14.5px] leading-[1.7] text-ink-body">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                  {outcomes.length > 0 && (
                    <>
                      <h2
                        className={`text-[16px] font-bold text-ink ${about.length > 0 ? 'mt-5' : ''}`}
                      >
                        Wat ga je leren?
                      </h2>
                      <ul className="mt-[9px] list-disc space-y-1.5 pl-5 text-[14.5px] leading-[1.6] text-ink-body marker:text-teal">
                        {outcomes.map((outcome) => (
                          <li key={outcome}>{outcome}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              )}

              <LessonList
                studyId={study.id}
                lessons={study.lessons.map((lesson) => ({
                  day: lesson.day,
                  title: lesson.title,
                  book: lesson.book,
                  chapter: lesson.chapter,
                  verseRange: lesson.verseRange ?? null,
                  focus: lesson.focus,
                  minutes: lesson.estimatedMinutes ?? 12,
                  chapterHref: chapterHrefFor(study.id, lesson),
                }))}
                completedDays={completedDays}
                currentDay={enrolled ? resumeDay : null}
                enrolled={enrolled}
                guest={!signedIn}
              />
            </div>

            {/* The rail: where you are, and what this study is made of. On a
                phone it stacks above the lessons, so the start button is not
                forty rows down. */}
            <aside className="flex w-[326px] flex-none flex-col gap-[13px] max-md:order-first max-md:w-full">
              <Card className="flex-none p-[18px]">
                <StudyActionBar />
              </Card>

              <Card className="flex-none p-[18px]">
                <h2 className="text-[14.5px] font-bold text-ink">Over deze studie</h2>
                <div className="mb-1 mt-3 h-px bg-line" />
                <AboutRow label="Soort" value={TYPE_LABEL[study.type] ?? study.type} />
                <AboutRow
                  label="Gedeelte"
                  value={readingPlan.map((entry) => `${entry.book} ${entry.chapters}`).join(' · ')}
                />
                <AboutRow
                  label="Vertaling"
                  value={
                    translations.find((entry) => entry.id === (settings.translation ?? study.startVersion))
                      ?.name ?? (settings.translation ?? study.startVersion)
                  }
                />
                <AboutRow label="Lessen" value={`${lessonsTotal}`} />
                <AboutRow label="Tijd per les" value={`± ${study.lessons[0]?.estimatedMinutes ?? 12} min`} last />
              </Card>

              {/* A generated book study points back to the book's own page,
                  which carries the introduction this page deliberately does
                  not repeat (see lib/bookStudies.ts). Guests only: a member
                  is redirected from that page back to this one
                  (lib/memberRedirects.ts). */}
              {isBookStudyId(study.id) && !signedIn && (
                <Card className="flex-none p-[18px]">
                  <h2 className="text-[14.5px] font-bold text-ink">Over {study.title}</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                    Waar het boek over gaat, wie het schreef, wanneer, en hoe het is opgebouwd.
                  </p>
                  <Link
                    href={`/bijbelboeken/${study.id.slice(BOOK_STUDY_PREFIX.length)}`}
                    className="mt-3 inline-flex text-[13.5px] font-semibold text-teal no-underline hover:text-teal-dark dark:text-teal-400"
                  >
                    Lees de inleiding op {study.title} ›
                  </Link>
                </Card>
              )}

              {/* Where to go next. Also the only links between the authored
                  studies that a crawler can follow: on /studies they sit
                  behind "Meer tonen". */}
              {related.length > 0 && (
                <Card className="flex-none p-[18px]">
                  <h2 className="text-[14.5px] font-bold text-ink">Meer studies</h2>
                  <div className="mb-1 mt-3 h-px bg-line" />
                  <ul>
                    {related.map((other, index) => (
                      <li
                        key={other.id}
                        className={`py-2.5 ${index === related.length - 1 ? '' : 'border-b border-line-soft'}`}
                      >
                        <Link
                          href={`/studies/${other.id}`}
                          className="group block rounded-md no-underline outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          <span className="block text-[13.5px] font-semibold text-ink group-hover:text-teal dark:group-hover:text-teal-400">
                            {other.title}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">
                            {other.description}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </AppShell>
    </StudySetupProvider>
  );
}

/** One of the four figures over the columns: label, value, and its unit. */
function DetailStat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card className="min-w-0 flex-1 px-[17px] py-[15px] max-md:px-[14px] max-md:py-[12px]">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
        <Icon aria-hidden size={14} strokeWidth={2} className="flex-none text-teal" />
        {label}
      </p>
      <p className="mt-[7px] flex items-baseline gap-[7px] max-md:flex-wrap max-md:gap-x-[6px] max-md:gap-y-0">
        <span className="text-[24px] font-bold tracking-[-0.5px] text-ink tabular-nums max-md:text-[20px]">{value}</span>
        <span className="text-[12px] text-ink-faint">{unit}</span>
      </p>
    </Card>
  );
}

/**
 * Up to three authored studies to go on to, most related first: every shared
 * bible book counts double, the same kind of study (Persoon, Gedeelte, ...)
 * once, and ties keep catalogue order. A generated book study only lists
 * authored studies that read from its book - otherwise nothing.
 */
function relatedStudies(study: CuratedStudy): CuratedStudy[] {
  const books = new Set(study.lessons.map((lesson) => lesson.book));
  const scored = curatedStudies
    .filter((other) => other.id !== study.id)
    .map((other, index) => {
      const shared = new Set(other.lessons.map((lesson) => lesson.book).filter((book) => books.has(book)));
      return { other, index, score: 2 * shared.size + (other.type === study.type ? 1 : 0) };
    });
  const pool = isBookStudyId(study.id) ? scored.filter((entry) => entry.score >= 2) : scored;
  return pool
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((entry) => entry.other);
}

/** One label/value row in "Over deze studie". */
function AboutRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-2 ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="flex-1 text-[13px] text-ink-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

/**
 * The single-chapter study for a lesson row, when that route opens exactly this
 * lesson (a book study's whole-chapter lesson). Null for a theme study or a
 * partial passage: sending those rows to the chapter route would open a
 * different lesson than the one listed.
 */
function chapterHrefFor(studyId: string, lesson: { day: number; book: string; chapter: number }): string | null {
  const book = findBook(lesson.book);
  if (!book) return null;
  const target = resolveChapterStudy(book.slug, lesson.chapter);
  if (!target || target.studyId !== studyId || target.lessonDay !== lesson.day) return null;
  return chapterStudyPath(book.slug, lesson.chapter);
}
