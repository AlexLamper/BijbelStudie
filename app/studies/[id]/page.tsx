import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, BookOpen, Clock, ListChecks } from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../lib/studyFlow';
import { isBookStudyId } from '../../../lib/bookStudies';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import StudySetupProvider, { StudyActionBar, StudySettingsButton } from './StudyOnboardingForm';
import LessonList from './LessonList';

const TEAL = '#0D9488';

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
 * Study detail and onboarding.
 *
 * Public and indexable: this is where someone decides whether a study is for
 * them, so it must be reachable without an account and crawlable. Only the
 * settings form needs a session, and it sends anonymous visitors to sign in at
 * the moment they press start.
 *
 * Three bands, and the page itself never scrolls. A fixed h-14 header, a fixed
 * bar of the same height at the foot, and between them two panes that scroll
 * independently - the pitch on the left, the lessons on the right. Both bars
 * span the full width, so the settings summary and the start/resume button hold
 * opposite corners of the page instead of stacking inside a 400px rail. A
 * twelve-lesson book study pushed all of that off-screen in the original
 * single-column layout.
 *
 * The state behind those two bars is one object, held by StudySetupProvider
 * above the whole page: the settings the header summarises are the settings the
 * footer's start button posts.
 */
export default async function StudyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = findStudy(id);
  if (!study) notFound();

  const session = await getServerSession(authOptions);

  let enrolled = false;
  let resumeDay = study.lessons[0]?.day ?? 1;
  let resumeStep: string | null = null;
  let completedDays: number[] = [];
  let settings: { rhythm?: string; depth?: string; translation?: string | null } = {};

  if (session?.user?.email) {
    await connectMongoDB();
    const user = await User.findOne({ email: session.user.email })
      .select('_id')
      .lean<{ _id: unknown }>();

    if (user) {
      const userId = String(user._id);
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
  const resumeHref = `/studie/${study.id}/${resumeDay}${resumeStep ? `?stap=${resumeStep}` : ''}`;
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];

  /**
   * The description, at most two paragraphs.
   *
   * `about` is authored hook first, shape of the book second, and mechanics
   * third ("je leest het hoofdstuk voor hoofdstuk, in volgorde") - and the
   * mechanics are already answered by the lesson list sitting next to it. Two
   * paragraphs is what someone reads before deciding; the third they skim.
   */
  const description = (
    study.about && study.about.length > 0 ? study.about : [study.description]
  ).slice(0, 2);

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
       summary in the header and the start button in the footer read and write
       one piece of state, and nothing else can contain both. It renders a
       fragment plus its dialog, so the layout below is unaffected - and this
       markup stays server-rendered, which is what keeps the page crawlable. */
    <StudySetupProvider
      studyId={study.id}
      translations={translations}
      defaultTranslation={settings.translation ?? study.startVersion}
      suggestedRhythm={(settings.rhythm as never) ?? study.suggestedRhythm ?? 'dagelijks'}
      suggestedDepth={(settings.depth as never) ?? study.suggestedDepth ?? 'kort'}
      enrolled={enrolled}
      resumeHref={resumeHref}
      resumeDay={resumeDay}
      lessonsTotal={study.lessons.length}
      lessonsCompleted={completedDays.length}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header. Stays put; everything below it scrolls in its own pane.
            Exactly h-14, the same height as the app navbar directly above it and
            as the action bar at the foot, so the three read as one chrome
            system rather than slabs stacked on slabs. One row: the back
            control, the identity block, and the settings pushed to the right
            edge.

            The identity block is a single line now. It carried a second, 11px
            line repeating the book names and the lesson count, which said what
            the reading facts in the left pane and the lesson list already say -
            and cost the header a line of height to do it. */}
        <header className="flex-none h-14 border-b border-gray-200 dark:border-border bg-white dark:bg-card">
          <div className="h-full px-3 sm:px-5 flex items-center gap-3">
            {/* A control, not a breadcrumb. It used to be a bare text link on its
                own line above the title, which both cost a full line of height and
                read as a stray caption. Now it is a bordered pill sitting on the
                baseline of everything else, with the arrow nudging left on hover. */}
            <Link
              href="/studies"
              title="Terug naar alle studies"
              aria-label="Terug naar alle studies"
              className="group press flex-none inline-flex items-center gap-1.5 h-9 pl-2 pr-2.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-[12.5px] font-medium text-gray-500 dark:text-muted-foreground no-underline transition-colors hover:text-foreground hover:bg-gray-50 dark:hover:bg-secondary hover:border-gray-300 dark:hover:border-muted-foreground/40"
            >
              <ArrowLeft
                size={14}
                className="flex-none transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              <span className="hidden sm:inline">Alle studies</span>
            </Link>

            <span aria-hidden className="hidden sm:block flex-none h-6 w-px bg-gray-200 dark:bg-border" />

            <div className="min-w-0 flex-1 flex items-center gap-2">
              <h1 className="text-[15px] sm:text-base font-bold text-foreground leading-tight truncate">
                {study.title}
              </h1>
              <span
                className="hidden sm:inline-flex flex-none items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: TEAL }}
              >
                {TYPE_LABEL[study.type] ?? study.type}
              </span>
            </div>

            {/* Where the lesson count, the total minutes and the starting
                chapter used to sit. Three numbers that never change and that
                you cannot act on do not earn the most reachable corner of the
                page; they moved down into the pitch, and the corner went to the
                settings, which are yours and adjustable. */}
            <StudySettingsButton />
          </div>
        </header>

        {/* Below lg the two panes stack and this wrapper is the single scroller,
            because a 400px rail beside a paragraph is not a phone layout. From
            lg it becomes the row and hands scrolling to each pane. */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-row">
          {/* Left: why this study. Deliberately short - it is a decision aid,
              not the study itself.

              Cut from here, and why: "Wat ga je leren?" (five authored bullets,
              or one per lesson when a study has none - twelve on Daniël, each a
              restatement of a lesson focus the rail already shows on tap), and
              "Hoe een les werkt", a five-row walkthrough of intro / lezen /
              verdieping / reflectie / toetsing plus a trailing note about the AI
              assistant. The flow explains itself the moment you are in it, and
              nobody decides to start a study because the steps were described
              to them first. What is left is the description and the three facts
              you actually weigh: how many lessons, how long, what you read.

              The measure is capped on this inner block rather than on the pane:
              the pane takes every pixel left over so the rail stays flush right
              and its divider runs the full height, while the prose stops at a
              readable width measured from the left. Capping the pane instead
              left a band of dead background between the two. */}
          <div className="lg:flex-1 lg:min-w-0 lg:overflow-y-auto">
            <div className="px-5 sm:px-8 py-6 lg:max-w-[680px]">
              {/* The banner. Its own 16:6 SVG under /images/studies - authored
                  per study, or per genre for a generated book study. `unoptimized`
                  because the optimiser refuses SVG without `dangerouslyAllowSVG`,
                  and these are our own files: nothing to optimise anyway.

                  A study without art renders nothing rather than an empty frame. */}
              {study.image ? (
                <Image
                  src={study.image}
                  alt={`Illustratie bij de studie ${study.title}`}
                  width={1200}
                  height={450}
                  unoptimized
                  priority
                  className="mb-5 block w-full h-auto rounded-xl border border-gray-200 dark:border-border"
                />
              ) : null}

              <h2 className="text-sm font-bold text-foreground mb-2.5">Waar gaat deze studie over?</h2>
              <div className="space-y-3">
                {description.map((paragraph, index) => (
                  <p key={index} className="text-[15px] leading-relaxed text-foreground/85">
                    {paragraph}
                  </p>
                ))}
              </div>

              <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-gray-500 dark:text-muted-foreground">
                <li className="inline-flex items-center gap-1.5">
                  <ListChecks size={13} className="flex-none" style={{ color: TEAL }} />
                  {study.lessons.length} lessen
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Clock size={13} className="flex-none" style={{ color: TEAL }} />
                  ± {formatStudyMinutes(minutes)} totaal
                </li>
                {readingPlan.map((entry) => (
                  <li key={entry.book} className="inline-flex items-center gap-1.5">
                    <BookOpen size={13} className="flex-none" style={{ color: TEAL }} />
                    {entry.book} {entry.chapters}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: the lessons, and nothing else. The rail used to open with a
              settings card and close with the progress block; both have their
              own bar now, and the list gets the whole rail - which is what the
              rail is for. */}
          <aside className="w-full lg:w-[400px] lg:flex-none flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-border bg-gray-50/60 dark:bg-card/40">
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
              }))}
              completedDays={completedDays}
              currentDay={enrolled ? resumeDay : null}
              enrolled={enrolled}
            />
          </aside>
        </div>

        {/* Foot: progress and the one action, across both panes. */}
        <StudyActionBar />
      </div>
    </StudySetupProvider>
  );
}
