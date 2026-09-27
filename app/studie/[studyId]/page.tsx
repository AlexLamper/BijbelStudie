import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../lib/authOptions';
import connectMongoDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { findStudy, getEnrollment } from '../../../lib/studyEnrollmentService';
import { studyResumeHref } from '../../../lib/dashboardResume';
import { generatePageMetadata } from '../../../lib/pageMetadata';

export const dynamic = 'force-dynamic';

/** A redirect, never a page of its own - and behind auth, so never indexed. */
export const metadata = generatePageMetadata('study');

interface PageProps {
  params: Promise<{ studyId: string }>;
}

/**
 * `/studie/<id>`: "open this study where I left off".
 *
 * A dispatcher, like `/studie` itself. Several surfaces link a study without a
 * lesson (the dashboard's continue card, /studies, the lesson thumbnails, older
 * app builds), and until this file existed every one of them was a 404.
 *
 *  - unknown study           -> /studies
 *  - guest                   -> /studies/<id>, the public detail page, which is
 *                               where a study is explained and started
 *  - signed in, not enrolled -> /studies/<id> (the detail page configures the
 *                               study; nothing is enrolled silently)
 *  - enrolled, finished      -> /studies/<id>
 *  - enrolled, running       -> /studie/<id>/<currentLessonDay>?stap=<step>,
 *                               the same href the dashboard's resume card and
 *                               the v1 `resume` object use (lib/dashboardResume)
 *
 * Only a dynamic segment BESIDE the static `hoofdstuk` one, which Next matches
 * first, so /studie/hoofdstuk/... is unaffected. The middleware leaves /studie
 * open to guests, so nothing there shadows this.
 */
export default async function StudyResumeRedirect({ params }: PageProps) {
  const { studyId } = await params;
  const study = findStudy(studyId);
  if (!study) redirect('/studies');

  const detail = `/studies/${study.id}`;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect(detail);

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select('_id')
    .lean<{ _id: unknown }>();
  if (!user) redirect(detail);

  const enrollment = await getEnrollment(String(user._id), study.id);
  if (!enrollment || enrollment.status === 'completed' || enrollment.completedAt) redirect(detail);

  redirect(studyResumeHref(study, enrollment.currentLessonDay, enrollment.currentStep));
}
