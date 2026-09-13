import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BookOpen, Clock, Layers, TrendingUp, type LucideIcon } from 'lucide-react';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import StudyProgress from '../../../models/StudyProgress.js';
import { buildMetadata } from '../../../lib/pageMetadata';
import { getVersions } from '../../../lib/local-data';
import { estimateStudyMinutes, formatStudyMinutes } from '../../../lib/studyFlow';
import { isBookStudyId } from '../../../lib/bookStudies';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import AppShell from '../../../components/shell/AppShell';
import { Card } from '../../../components/kit/primitives';
import { bannerGradient } from '../../../components/kit/primitives';
import StudySetupProvider, { StudyActionBar, StudySettingsButton } from './StudyOnboardingForm';
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
      <AppShell title={study.title} active="/studies">
        <div className="flex min-h-full flex-col gap-4">
          {/* The banner. A gradient plate rather than artwork, per RULES.md §4:
              the design draws one here and the server has no cover image for a
              study - `StudyArtwork` draws the catalogue rows instead. */}
          <div
            className="relative flex h-[142px] flex-none flex-col justify-end overflow-hidden rounded-card px-[24px] pb-[18px] pt-[32px]"
            style={{ background: bannerGradient(study.id) }}
          >
            <StudySettingsButton className="absolute right-[10px] top-[10px] z-10" />
            <div className="mt-[10px] flex items-center gap-1.5 text-[11.5px] text-white/70">
              <Link href="/studies" className="text-white/70 no-underline hover:text-white">
                Studies
              </Link>
              <span aria-hidden>&rsaquo;</span>
              <span className="font-semibold text-white">{study.title}</span>
            </div>
            <h1 className="mt-1.5 text-[25px] font-bold leading-none tracking-[-0.5px] text-white">
              {study.title}
            </h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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
          <div className="flex flex-none gap-[14px]">
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

          <div className="flex min-h-0 flex-1 gap-5">
            {/* The pitch, then the lessons. */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {about.length > 0 && (
                <Card className="flex-none px-[21px] py-[19px]">
                  <h2 className="text-[16px] font-bold text-ink">Waar gaat deze studie over?</h2>
                  <div className="mt-[9px] space-y-3">
                    {about.map((paragraph, index) => (
                      <p key={index} className="text-[14.5px] leading-[1.7] text-ink-body">
                        {paragraph}
                      </p>
                    ))}
                  </div>
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
                }))}
                completedDays={completedDays}
                currentDay={enrolled ? resumeDay : null}
                enrolled={enrolled}
                guest={!signedIn}
              />
            </div>

            {/* The rail: where you are, and what this study is made of. */}
            <aside className="flex w-[326px] flex-none flex-col gap-[13px]">
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
    <Card className="flex-1 px-[17px] py-[15px]">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
        <Icon aria-hidden size={14} strokeWidth={2} className="flex-none text-teal" />
        {label}
      </p>
      <p className="mt-[7px] flex items-baseline gap-[7px]">
        <span className="text-[24px] font-bold tracking-[-0.5px] text-ink tabular-nums">{value}</span>
        <span className="text-[12px] text-ink-faint">{unit}</span>
      </p>
    </Card>
  );
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
