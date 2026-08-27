import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../lib/authOptions';
import connectMongoDB from '../../lib/mongodb';
import User from '../../models/User';
import { newestActiveEnrollment } from '../../lib/studyEnrollmentService';
import { isStepKey } from '../../lib/studyFlow';
import { generatePageMetadata } from '../../lib/pageMetadata';

export const dynamic = 'force-dynamic';

export const metadata = generatePageMetadata('study');

interface PageProps {
  searchParams: Promise<{ book?: string; chapter?: string; version?: string }>;
}

/**
 * A dispatcher, not a page.
 *
 * `/studie` used to BE the study experience: bible text on the left, a five-tab
 * panel of commentary, grondtekst, context, notes and AI on the right, plus a
 * floating assistant. That is the screen this redesign replaced - it read as a
 * reference work rather than a guided study, and it kept the active study in
 * sessionStorage, so closing the tab lost your place.
 *
 * The URL survives because it is load-bearing: all 66 public /bijbelboeken
 * pages, the dashboard and several other surfaces link here with
 * `?book=&chapter=`. Those are reading intents, so they now go to /lezen, which
 * is where free browsing and the reference panels live. A bare /studie resumes
 * whichever study you were last working on.
 */
export default async function StudieDispatcherPage({ searchParams }: PageProps) {
  const { book, chapter, version } = await searchParams;

  // A passage was asked for: this is a reading intent, not a study one.
  if (book) {
    const params = new URLSearchParams({ book });
    if (chapter) params.set('chapter', chapter);
    if (version) params.set('version', version);
    redirect(`/lezen?${params.toString()}`);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/studies');

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select('_id')
    .lean<{ _id: unknown }>();
  if (!user) redirect('/studies');

  const enrollment = await newestActiveEnrollment(String(user._id));
  if (!enrollment) redirect('/studies');

  const step =
    enrollment.currentStep && isStepKey(enrollment.currentStep) ? enrollment.currentStep : null;

  redirect(
    `/studie/${enrollment.studyId}/${enrollment.currentLessonDay}${step ? `?stap=${step}` : ''}`,
  );
}
