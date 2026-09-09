import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, findAnyStudy } from '../../../../../lib/bookStudies';
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
import WalkShell, {
  type WalkContent,
  type WalkDemo,
} from '../../../../../components/study/variants/weg/WalkShell';
import {
  routeArtFor,
  stopReference,
} from '../../../../../components/study/variants/weg/routeArt';

/**
 * Ontwerp 3 - "Weg". Het lesscherm: één stop op de route.
 *
 * A review URL, never indexed. It inherits `app/studie/layout.tsx` - the
 * immersive window: no app header, the 56px hover rail, the inset rounded
 * frame - because that is the shell the real lesson lives in and the design has
 * to be judged inside it. The static `versie-3` segment wins over the sibling
 * `[studyId]`, so this resolves without touching the real route.
 *
 * Static data only. `findAnyStudy` (pure - not the enrollment service, which
 * imports mongoose), `getLessonContent`, `resolveSteps`, `resolvePassage`,
 * `getVersions`. There is no session read, no enrollment, no lesson state and
 * no write of any kind; the passage and the commentary are fetched by the two
 * reused client components from their own API routes.
 */

export const metadata: Metadata = {
  title: 'Ontwerp 3 — Weg · Op de route',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

const KIND_BY_ID = new Map(CATALOGUE_ENTRIES.map((entry) => [entry.study.id, entry.kind]));

/**
 * DEMO DATA. Fixed, invented, and never read from the database - this preview
 * must not touch a reader's real XP, streak or progress. The numbers match the
 * real ones in shape: a lesson is worth 25 XP (`XpEvent.study_lesson`), the
 * remainder-first copy and the named unlock come straight from
 * docs/reward-moments-plan.md §3.6, and the week strip is Monday-first with
 * today in the last cell.
 */
const DEMO_STREAK = 5;
const DEMO_WEEK = [false, false, true, true, true, true, true];
const DEMO_XP = 25;
const DEMO_LEVEL = 5;
const DEMO_REMAINING_XP = 40;
const DEMO_NEXT_UNLOCK = 'Olijfboom';

export default async function WegLessonPage({ params }: PageProps) {
  const { id, day } = await params;
  const lessonDay = Number(day);
  const study = findAnyStudy(id);
  if (!study || !Number.isInteger(lessonDay)) notFound();

  const lesson = findLesson(study, lessonDay);
  if (!lesson) notFound();

  const kind = KIND_BY_ID.get(study.id) ?? study.type;
  const art = routeArtFor({ id: study.id, type: study.type, kind });

  const lessonContent = getLessonContent(study.id, lessonDay);
  const steps = resolveSteps(lesson, lessonContent);
  const passage = resolvePassage(lesson, lessonContent);

  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );
  const version = study.startVersion;
  const translationName =
    versions.find((entry) => entry.id === version)?.name ?? '';

  const content: WalkContent = {
    intro: lessonContent?.intro
      ? {
          headline: lessonContent.intro.headline,
          body: lessonContent.intro.body,
          watchFor: lessonContent.intro.watchFor ?? [],
        }
      : null,
    readingCue: lessonContent?.word?.readingCue ?? null,
    depth: {
      body: lessonContent?.depth?.body ?? [],
      terms: lessonContent?.depth?.terms ?? [],
    },
    reflection: {
      question: resolveReflectionQuestion(lesson, lessonContent),
      prompts: lessonContent?.reflection?.prompts ?? [],
      placeholder: lessonContent?.reflection?.placeholder ?? null,
    },
    quiz: { questionCount: lessonContent?.quiz?.questionCount ?? 5 },
  };

  const nextDay = nextLessonDay(study, lessonDay);
  const nextLesson = nextDay != null ? findLesson(study, nextDay) : undefined;

  const demo: WalkDemo = {
    doneBefore: Math.max(0, Math.min(lessonDay - 1, study.lessons.length - 1)),
    xpAwarded: DEMO_XP,
    level: DEMO_LEVEL,
    remainingXp: DEMO_REMAINING_XP,
    nextUnlock: DEMO_NEXT_UNLOCK,
    streak: DEMO_STREAK,
    weekDone: DEMO_WEEK,
    nextWhen: 'Morgen',
  };

  return (
    <WalkShell
      studyId={study.id}
      studyTitle={study.title}
      lessonsTotal={study.lessons.length}
      day={lesson.day}
      lessonTitle={lesson.title}
      minutes={lesson.estimatedMinutes ?? 12}
      steps={steps}
      passage={{
        book: passage.book,
        chapter: passage.chapter,
        verseStart: passage.verseStart,
        verseEnd: passage.verseEnd,
      }}
      reference={stopReference(lesson)}
      version={version}
      translationName={translationName}
      commentaryId={resolveCommentaryId({})}
      content={content}
      art={art}
      next={
        nextLesson
          ? {
              day: nextLesson.day,
              title: nextLesson.title,
              reference: stopReference(nextLesson),
            }
          : null
      }
      demo={demo}
    />
  );
}
