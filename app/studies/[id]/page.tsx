import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BookOpen, CheckCircle2, Clock, ListChecks, Target } from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes } from '../../../lib/studyFlow';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import StudyOnboardingForm from './StudyOnboardingForm';

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

/**
 * Study detail and onboarding.
 *
 * Public and indexable: this is where someone decides whether a study is for
 * them, so it must be reachable without an account and crawlable. Only the
 * settings form needs a session, and it sends anonymous visitors to sign in at
 * the moment they press start.
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

  return (
    <div className="min-h-full">
      <div className="px-5 sm:px-8 xl:px-10 py-8 max-w-5xl mx-auto">
        <Link
          href="/studies"
          className="text-xs text-muted-foreground hover:text-foreground no-underline"
        >
          &larr; Alle studies
        </Link>

        <header className="mt-3 mb-7">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white mb-2.5"
            style={{ backgroundColor: TEAL }}
          >
            {study.type}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {study.title}
          </h1>
          <p className="mt-2 text-[15px] text-gray-600 dark:text-muted-foreground max-w-2xl leading-relaxed">
            {study.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={15} /> {study.lessons.length} lessen
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} /> ongeveer {minutes} min totaal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={15} /> start bij {study.startBook} {study.startChapter}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
          <div className="space-y-7 min-w-0">
            {study.about && study.about.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-foreground mb-2.5">
                  Waar gaat deze studie over?
                </h2>
                <div className="space-y-3">
                  {study.about.map((paragraph, index) => (
                    <p key={index} className="text-[15px] leading-relaxed text-foreground/90">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {study.outcomes && study.outcomes.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-2.5">
                  <Target size={16} style={{ color: TEAL }} /> Wat ga je leren?
                </h2>
                <ul className="space-y-2">
                  {study.outcomes.map((outcome, index) => (
                    <li key={index} className="flex gap-2.5 text-[15px] text-foreground/90 leading-relaxed">
                      <CheckCircle2 size={16} className="mt-0.5 flex-none" style={{ color: TEAL }} />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-base font-bold text-foreground mb-3">De lessen</h2>
              <ol className="rounded-xl border border-gray-200 dark:border-border divide-y divide-gray-200 dark:divide-border overflow-hidden">
                {study.lessons.map((lesson) => {
                  const done = completedDays.includes(lesson.day);
                  return (
                    <li key={lesson.day} className="flex items-start gap-3 p-4">
                      <span
                        className="h-6 w-6 rounded-full flex-none flex items-center justify-center text-[11px] font-bold"
                        style={
                          done
                            ? { backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }
                            : { backgroundColor: 'rgba(0,0,0,0.05)' }
                        }
                      >
                        {done ? <CheckCircle2 size={13} /> : lesson.day}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                        <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                          {lesson.book} {lesson.chapter}
                          {lesson.verseRange ? `:${lesson.verseRange}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <div className="lg:sticky lg:top-6">
            <StudyOnboardingForm
              studyId={study.id}
              translations={versions.map((version) => ({ id: version.id, name: version.name }))}
              defaultTranslation={study.startVersion}
              suggestedRhythm={study.suggestedRhythm ?? 'dagelijks'}
              suggestedDepth={study.suggestedDepth ?? 'kort'}
              enrolled={enrolled}
              resumeHref={resumeHref}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
