import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ListChecks,
  PenLine,
  Target,
  Trophy,
} from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes } from '../../../lib/studyFlow';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import StudyStartPanel from './StudyOnboardingForm';
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
 * the description, outcomes and lesson list. Ten pages do not need caching.
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
    ogEyebrow: 'Begeleide studie',
  });
}

const STEP_EXPLAINER = [
  { icon: Compass, label: 'Intro', text: 'De context voordat je leest' },
  { icon: BookOpen, label: 'Het Woord', text: 'Alleen het gedeelte van deze les' },
  { icon: Layers, label: 'Verdieping', text: 'Uitleg, kaarten en grondtekst' },
  { icon: PenLine, label: 'Reflectie', text: 'Jouw antwoord, bewaard als notitie' },
  { icon: Trophy, label: 'Toetsing', text: 'Korte quiz over het gedeelte' },
];

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
 * The page fills the viewport and does not scroll as a whole. Two panes scroll
 * independently instead - the description on the left, the lesson list on the
 * right - so the title, the progress and the start button stay put no matter
 * how many lessons a study has. A twelve-lesson book study pushed all of that
 * off-screen in the previous single-column layout.
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
   * "Wat ga je leren?", with a fallback.
   *
   * Only two of the eleven studies have authored `outcomes`, and the section
   * simply disappeared for the other nine - which on a three-lesson study left
   * the left column with nothing in it but the step explainer. Every lesson has
   * a `focus` question by contract, and those questions are exactly what the
   * study answers, so they stand in until outcomes are written.
   */
  const learningPoints =
    study.outcomes && study.outcomes.length > 0
      ? study.outcomes
      : study.lessons.map((lesson) => lesson.focus.split('?')[0].trim() + '?');

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
    <div className="h-full flex flex-col lg:overflow-hidden">
      {/* Header. Stays put; everything below it scrolls in its own pane. */}
      <header className="flex-none border-b border-gray-200 dark:border-border bg-white dark:bg-card">
        {/* Deliberately shallow. This bar is fixed while the panes below it
            scroll, so every pixel it takes is a pixel the lesson list never gets
            back - it used to stand ~165px tall and read as a slab. */}
        <div className="px-5 sm:px-8 py-2.5 sm:py-3">
          <Link
            href="/studies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground no-underline mb-1.5"
          >
            <ArrowLeft size={13} /> Alle studies
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: TEAL }}
                >
                  {TYPE_LABEL[study.type] ?? study.type}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-muted-foreground truncate">
                  {books.join(' · ')}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {study.title}
              </h1>
              {/* No description here. It was a two-line clamp of the exact text
                  the "Waar gaat deze studie over?" section prints in full a few
                  pixels lower - two lines of duplicate copy were a third of this
                  bar's height. */}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-muted-foreground flex-none">
              <span className="inline-flex items-center gap-1.5">
                <ListChecks size={14} /> {study.lessons.length} lessen
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} /> ± {minutes} min totaal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={14} /> start bij {study.startBook} {study.startChapter}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left: what the study is and how it works. Scrolls on its own.
            Capped rather than free-growing: on a wide monitor an uncapped column
            put a 400px rail against a metre of empty white, which is most of why
            this page read as broken on the shorter studies.

            The row is NOT centred. Centring it offset both panes by half the
            leftover width, so this column's px-8 no longer lined up with the
            header's - the header is full-bleed, and the body text visibly
            stepped in from the title above it. Same padding, same left edge.

            The cap therefore sits on the INNER block, not on the pane: the pane
            takes every pixel left over so the rail stays flush against the right
            edge and its divider runs the full height, while the prose still
            stops at a readable 760px measured from the left. Capping the pane
            instead left a band of dead background between the two. */}
        <div className="flex-1 min-w-0 lg:overflow-y-auto">
          <div className="px-5 sm:px-8 py-6 space-y-8 lg:max-w-[760px]">
            <section>
              <h2 className="text-sm font-bold text-foreground mb-2.5">Waar gaat deze studie over?</h2>
              <div className="space-y-3">
                {(study.about && study.about.length > 0 ? study.about : [study.description]).map(
                  (paragraph, index) => (
                    <p key={index} className="text-[15px] leading-relaxed text-foreground/85">
                      {paragraph}
                    </p>
                  ),
                )}
              </div>
            </section>

            {/* Always populated. `outcomes` is authored per study and most of them
                do not have it yet; every lesson DOES have a `focus` question, and
                those are the questions the study answers - so an unwritten study
                still says what you get out of it instead of showing nothing. */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                <Target size={15} style={{ color: TEAL }} /> Wat ga je leren?
              </h2>
              <ul className="space-y-2">
                {learningPoints.map((point, index) => (
                  <li key={index} className="flex gap-2.5 text-[14px] text-foreground/85 leading-relaxed">
                    <CheckCircle2 size={15} className="mt-0.5 flex-none" style={{ color: TEAL }} />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                <BookOpen size={15} style={{ color: TEAL }} /> Wat je gaat lezen
              </h2>
              <ul className="flex flex-wrap gap-1.5">
                {readingPlan.map((entry) => (
                  <li
                    key={entry.book}
                    className="inline-flex items-baseline gap-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-2.5 py-1.5"
                  >
                    <span className="text-[12.5px] font-semibold text-foreground">{entry.book}</span>
                    <span className="text-[11.5px] text-gray-500 dark:text-muted-foreground">
                      {entry.chapters}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold text-foreground mb-3">Hoe een les werkt</h2>
              <ol className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card divide-y divide-gray-200 dark:divide-border overflow-hidden">
                {STEP_EXPLAINER.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span
                        className="h-7 w-7 rounded-lg flex items-center justify-center flex-none"
                        style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                      >
                        <Icon size={13} style={{ color: TEAL }} />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground w-11 flex-none">
                        Stap {index + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground w-[92px] flex-none">
                        {step.label}
                      </span>
                      <span className="text-[12.5px] text-gray-500 dark:text-muted-foreground leading-snug min-w-0">
                        {step.text}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2.5 text-[12px] text-gray-400 dark:text-muted-foreground">
                Een les zonder geschreven intro begint direct bij het bijbelgedeelte. De AI-assistent
                is in elke stap beschikbaar.
              </p>
            </section>
          </div>
        </div>

        {/* Right: start, settings and the lessons. */}
        <aside className="w-full lg:w-[400px] flex-none flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-border bg-gray-50/60 dark:bg-card/40">
          <div className="flex-none p-4 sm:p-5 border-b border-gray-200 dark:border-border">
            <StudyStartPanel
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
            />
          </div>

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
    </div>
  );
}
