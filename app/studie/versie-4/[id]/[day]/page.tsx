import { notFound } from 'next/navigation';

import { findAnyStudy } from '../../../../../lib/bookStudies';
import { getLessonContent } from '../../../../../lib/data/study-lessons';
import { getVersions } from '../../../../../lib/local-data';
import {
  findLesson,
  nextLessonDay,
  resolveCommentaryId,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
} from '../../../../../lib/studyFlow';
import RustLessonReader from '../../../../../components/study/variants/rust/RustLessonReader';
import type { RustLessonPayload } from '../../../../../components/study/variants/rust/RustSteps';

/**
 * Studieflow-ontwerp 4 - "Rust". Scherm 3 van 3: de les.
 *
 * The calmest reading screen in the product: one column at a real measure,
 * scripture in the serif, and everything else deferring to it. The step rail is
 * a hairline. The close is one sentence and one named action - no confetti, no
 * meters, no score.
 *
 * It inherits app/studie/layout.tsx, which is the immersive window: no app
 * header, a 56px hover rail, an inset rounded frame. So the page owns its own
 * height and does its scrolling inside that frame.
 *
 * A review URL, never indexed. Everything on it is resolved from authored
 * static content: `findAnyStudy`, `getLessonContent`, `resolveSteps`,
 * `resolvePassage`, `getVersions`. No session, no enrollment, no lesson state,
 * no database. The passage itself is fetched client-side from the public
 * /api/bible/chapter endpoint, exactly as the live reader does.
 */
export const metadata = {
  title: 'Les - ontwerp 4 (Rust)',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

/** Display names for the commentaries `resolveCommentaryId` can return. */
const COMMENTARY_LABEL: Record<string, string> = {
  matthew_henry_nl: 'Matthew Henry',
  dachsel: 'Dachsel',
};

/** "statenvertaling" -> "Statenvertaling", when the manifest has no title. */
function prettifyVersion(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export default async function RustLessonPage({ params }: PageProps) {
  const { id, day } = await params;

  const studyId = decodeURIComponent(id);
  const lessonDay = Number(day);
  const study = findAnyStudy(studyId);
  if (!study || !Number.isInteger(lessonDay)) notFound();

  const lesson = findLesson(study, lessonDay);
  if (!lesson) notFound();

  const content = getLessonContent(studyId, lessonDay);
  const steps = resolveSteps(lesson, content);
  const passage = resolvePassage(lesson, content);

  // The translation the study starts in. The real lesson uses the reader's own
  // enrollment setting, which a preview has no way to know.
  const version = study.startVersion;
  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const versionLabel =
    versions.find((entry) => entry.id === version)?.name ?? prettifyVersion(version);

  const commentaryId = resolveCommentaryId({});
  const nextDay = nextLessonDay(study, lessonDay);
  const nextLesson = nextDay !== null ? findLesson(study, nextDay) : undefined;

  const reference = `${passage.book} ${passage.chapter}${
    passage.verseRange ? `:${passage.verseRange}` : ''
  }`;

  const payload: RustLessonPayload = {
    studyId: study.id,
    studyTitle: study.title,
    day: lesson.day,
    title: lesson.title,
    lessonsTotal: study.lessons.length,
    minutes: lesson.estimatedMinutes ?? 12,
    reference,
    passage: {
      book: passage.book,
      chapter: passage.chapter,
      verseStart: passage.verseStart,
      verseEnd: passage.verseEnd,
    },
    version,
    versionLabel,
    commentaryLabel: COMMENTARY_LABEL[commentaryId] ?? prettifyVersion(commentaryId),
    steps,
    intro: content?.intro
      ? {
          headline: content.intro.headline,
          body: content.intro.body ?? [],
          watchFor: content.intro.watchFor ?? [],
        }
      : null,
    readingCue: content?.word?.readingCue ?? null,
    depth: content?.depth
      ? { body: content.depth.body ?? [], terms: content.depth.terms ?? [] }
      : null,
    reflection: {
      question: resolveReflectionQuestion(lesson, content),
      prompts: content?.reflection?.prompts ?? [],
      placeholder: content?.reflection?.placeholder ?? null,
    },
    quiz: { questionCount: content?.quiz?.questionCount ?? 5 },
    next: nextLesson ? { day: nextLesson.day, title: nextLesson.title } : null,
  };

  return (
    <RustLessonReader
      lesson={payload}
      detailHref={`/studies/versie-4/${study.id}`}
      nextHref={nextLesson ? `/studie/versie-4/${study.id}/${nextLesson.day}` : null}
    />
  );
}
