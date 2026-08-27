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

  const versions = await getVersions().catch(() => [] as { id: string; name: string }[]);
  const minutes = estimateStudyMinutes(study);
  const resumeHref = `/studie/${study.id}/${resumeDay}${resumeStep ? `?stap=${resumeStep}` : ''}`;
  const books = [...new Set(study.lessons.map((lesson) => lesson.book))];

  return (
    <div className="h-full flex flex-col lg:overflow-hidden">
      {/* Header. Stays put; everything below it scrolls in its own pane. */}
      <header className="flex-none border-b border-gray-200 dark:border-border bg-white dark:bg-card">
        <div className="px-5 sm:px-8 py-4 sm:py-5">
          <Link
            href="/studies"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground no-underline mb-2.5"
          >
            <ArrowLeft size={13} /> Alle studies
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
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
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {study.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground max-w-2xl leading-relaxed line-clamp-2">
                {study.description}
              </p>
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
        {/* Left: what the study is and how it works. Scrolls on its own. */}
        <div className="flex-1 min-w-0 lg:overflow-y-auto">
          <div className="px-5 sm:px-8 py-6 space-y-7 max-w-3xl">
            {study.about && study.about.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-foreground mb-2.5">Waar gaat deze studie over?</h2>
                <div className="space-y-3">
                  {study.about.map((paragraph, index) => (
                    <p key={index} className="text-[14.5px] leading-relaxed text-foreground/85">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {study.outcomes && study.outcomes.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-2.5">
                  <Target size={15} style={{ color: TEAL }} /> Wat ga je leren?
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {study.outcomes.map((outcome, index) => (
                    <li key={index} className="flex gap-2 text-[14px] text-foreground/85 leading-relaxed">
                      <CheckCircle2 size={15} className="mt-0.5 flex-none" style={{ color: TEAL }} />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-sm font-bold text-foreground mb-2.5">Hoe een les werkt</h2>
              <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
                {STEP_EXPLAINER.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.label}
                      className="rounded-xl border border-gray-200 dark:border-border p-3 bg-white dark:bg-card"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="h-6 w-6 rounded-lg flex items-center justify-center flex-none"
                          style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
                        >
                          <Icon size={13} style={{ color: TEAL }} />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-muted-foreground">
                          Stap {index + 1}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-foreground leading-tight">{step.label}</p>
                      <p className="text-[11.5px] text-gray-500 dark:text-muted-foreground leading-snug mt-0.5">
                        {step.text}
                      </p>
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
              translations={versions.map((version) => ({ id: version.id, name: version.name }))}
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
