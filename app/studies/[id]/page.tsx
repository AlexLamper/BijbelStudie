import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../lib/studyFlow';
import { isBookStudyId } from '../../../lib/bookStudies';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import SceneShell from '../../../components/scene/SceneShell';
import { SCENE_TREE, sceneSvg } from '../../../components/scene/scene-svg';
import { GlassStat, Panel, SectionHeading } from '../../../components/scene/pieces';
import { EYEBROW, TEAL_ON_DARK } from '../../../components/scene/tokens';
import StudySetupProvider, { StudyActionBar } from './StudyOnboardingForm';
import LessonList from './LessonList';

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
 * Study detail and onboarding, in the shared immersive scene.
 *
 * Public and indexable: this is where someone decides whether a study is for
 * them, so it must be reachable without an account and crawlable. Only the
 * settings form needs a session, and it sends anonymous visitors to sign in at
 * the moment they press start.
 *
 * The three-band chrome this page used to be - a fixed h-14 header, two panes
 * scrolling independently, a fixed action bar at the foot, and the document
 * itself never moving - could not stay: the scene's depth engine measures
 * `window.scrollY`, and inside a fixed-height box the landscape never moves. So
 * the page is the shell's three layers now, which carry the same three things
 * in the same order:
 *
 *   the sky      what this study is, and the one action - start or resume
 *   the horizon  the four facts you weigh: lessons, time, books, progress
 *   the desk     the pitch, the reading plan, the lessons
 *
 * There is no cover picture on the desk any more. The landscape behind the page
 * is already this study's view; a drawn horizon in the column repeated it a size
 * smaller and cost a screen of text. `StudyArtwork` is untouched - it still
 * draws the /studies rows and featured cards - and `study.image` still goes out
 * verbatim over /api/v1/studies to the shipped app.
 *
 * `backdrop="static"` with the server-rendered SVG, because there is no
 * guaranteed session here; `gateId` points at the hero so the live canvas only
 * runs while the first screen is actually on show and stops for good once the
 * reader is down among the lessons.
 *
 * The state behind the settings dialog and the start button is still one
 * object, held by StudySetupProvider above the whole page.
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
      <SceneShell svg={sceneSvg()} {...SCENE_TREE} gateId="studie-hero" header rail>
        {/* -- Layer 1: the sky ---------------------------------------- */}
        <section
          id="studie-hero"
          aria-labelledby="studie-titel"
          className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center pb-32 pt-10"
        >
          <div className="scene-sky w-full max-w-[46rem]">
            {/* A control, not a breadcrumb: the way back out of a study you
                decided against, on the same baseline as everything else. */}
            <Link
              href="/studies"
              title="Terug naar alle studies"
              className="press group inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 py-2 text-[12.5px] font-medium text-white/80 no-underline outline-none backdrop-blur-md transition-colors hover:border-white/45 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowLeft
                size={14}
                aria-hidden
                className="flex-none transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              Alle studies
            </Link>

            <p className={`${EYEBROW} mt-7`} style={{ color: TEAL_ON_DARK }}>
              {TYPE_LABEL[study.type] ?? study.type}
            </p>
            <h1
              id="studie-titel"
              className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl xl:text-6xl"
            >
              {study.title}
            </h1>
            <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-white/85 sm:text-lg">
              {study.description}
            </p>

            {/* Where you are, and the one way on. */}
            <div className="mt-9">
              <StudyActionBar />
            </div>
          </div>
        </section>

        {/* -- Layer 2: the horizon ------------------------------------ */}
        <div className="scene-horizon -mt-24">
          <dl className="stagger-in grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <GlassStat
              label="Lessen"
              value={`${lessonsTotal}`}
              unit={lessonsTotal === 1 ? 'les' : 'lessen'}
            />
            <GlassStat label="Tijd" value={formatStudyMinutes(minutes)} unit="totaal" />
            <GlassStat
              label="Bijbelboeken"
              value={`${books.length}`}
              unit={books.length === 1 ? 'boek' : 'boeken'}
            />
            <GlassStat
              label="Voortgang"
              value={`${pct}%`}
              unit={`${lessonsDone} van ${lessonsTotal}`}
              note={enrolled ? undefined : 'Nog niet begonnen'}
            />
          </dl>
        </div>

        {/* -- Layer 3: the desk --------------------------------------- */}
        <div className="grid w-full grid-cols-1 gap-6 pb-24 pt-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            {/* No cover picture here. The scene behind the page IS this study's
                view; a second drawn horizon in the column repeated it at a
                smaller size and pushed the text down a screen. StudyArtwork
                still draws the catalogue rows and the featured cards on
                /studies, and `study.image` is still served verbatim to the app
                by /api/v1/studies - neither may be removed for this. */}
            {about.length > 0 && (
              <Panel className="p-6" labelledBy="studie-over">
                <SectionHeading id="studie-over" title="Waar gaat deze studie over?" />
                <div className="mt-3 space-y-3">
                  {about.map((paragraph, index) => (
                    <p key={index} className="text-[15px] leading-relaxed text-white/80">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Panel>
            )}

            <section aria-labelledby="studie-leesplan">
              <SectionHeading
                id="studie-leesplan"
                title="Wat je leest"
                subtitle="De hoofdstukken die deze studie langsgaat, in volgorde."
                rule
              />
              <ul className="m-0 mt-1 divide-y divide-white/10 p-0">
                {readingPlan.map((entry) => (
                  <li
                    key={entry.book}
                    className="flex list-none items-baseline justify-between gap-4 py-3"
                  >
                    <span className="min-w-0 truncate text-[15px] font-semibold text-white">
                      {entry.book}
                    </span>
                    <span className="flex-none text-sm tabular-nums text-white/65">
                      hoofdstuk {entry.chapters}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* The lessons. Sticks once it reaches the top and scrolls inside
              itself, so a twelve-lesson book study never runs the column past
              the end of the page. `top-[4.5rem]` clears the sticky h-14 navbar. */}
          <aside className="min-w-0 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
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
              guest={!signedIn}
            />
          </aside>
        </div>
      </SceneShell>
    </StudySetupProvider>
  );
}
