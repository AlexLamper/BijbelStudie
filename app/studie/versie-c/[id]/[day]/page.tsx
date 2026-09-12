import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATALOGUE_ENTRIES, bookSlugFromStudyId, findAnyStudy } from '../../../../../lib/bookStudies';
import { getBibleBook } from '../../../../../lib/content/bibleBooks';
import { getLessonContent } from '../../../../../lib/data/study-lessons';
import { getVersions } from '../../../../../lib/local-data';
import {
  findLesson,
  nextLessonDay,
  resolvePassage,
  resolveReflectionQuestion,
  resolveSteps,
} from '../../../../../lib/studyFlow';
import LessonC, {
  type LessonDemoC,
  type LessonPayloadC,
} from '../../../../../components/study/variants/c/LessonC';

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

/**
 * Ontwerp C - "Doorlopend" - screen 3 of 3: one lesson.
 *
 * A REVIEW URL, and the reason it can exist at all is that everything the flow
 * needs in order to be judged is resolvable without a database: `findAnyStudy`,
 * `getLessonContent`, `resolveSteps`, `resolvePassage` and `getVersions` are
 * all pure or file-backed. The real page additionally reads the session, the
 * enrollment, StudyProgress and StudyLessonState; none of that is touched here,
 * so opening this URL cannot create, resume or complete anything - and the
 * passage renderer it uses cannot write a note either.
 *
 * It inherits app/studie/layout.tsx - no app header, the 56px hover rail, the
 * inset rounded frame - because the flow is a window, not the app shell, and a
 * variant that changed that would not be comparable with the other two.
 *
 * The static `versie-c` segment wins over the sibling `[studyId]`, so
 * /studie/versie-c/... resolves here and every real lesson URL still resolves
 * to the real page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, day } = await params;
  const study = findAnyStudy(id);
  const lesson = study ? findLesson(study, Number(day)) : undefined;
  return {
    title: `${lesson ? lesson.title : 'Les'} - ontwerp C (Doorlopend)`,
    robots: { index: false, follow: false },
  };
}

/**
 * DEMO DATA. Invented and fixed: how many lessons of this study are already
 * done, how many days in a row have been read, and what was already in the
 * reflection field. On the real page these come from StudyProgress, the streak
 * on the User document and StudyLessonState. Nothing here is read from or
 * written to anything.
 */
const DEMO: LessonDemoC = {
  lessonsDone: 2,
  streak: 6,
  note: '',
};

/** The part of the book's outline this chapter falls in. */
function sectionFor(
  outline: { range: string; title: string; summary: string }[],
  chapter: number,
): { title: string; summary: string } | null {
  for (const section of outline) {
    const [rawStart, rawEnd] = section.range.split(/[-–—]/);
    const start = parseInt(rawStart, 10);
    const end = parseInt(rawEnd ?? rawStart, 10);
    if (Number.isNaN(start)) continue;
    if (chapter >= start && chapter <= (Number.isNaN(end) ? start : end)) {
      return { title: section.title, summary: section.summary };
    }
  }
  return null;
}

export default async function DoorlopendLessonPage({ params }: PageProps) {
  const { id, day } = await params;
  const lessonDay = Number(day);

  const study = findAnyStudy(id);
  if (!study || !Number.isInteger(lessonDay)) notFound();

  const lesson = findLesson(study, lessonDay);
  if (!lesson) notFound();

  const entry = CATALOGUE_ENTRIES.find((row) => row.study.id === study.id);
  const content = getLessonContent(study.id, lessonDay);
  const steps = resolveSteps(lesson, content);
  const passage = resolvePassage(lesson, content);

  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );

  const slug = bookSlugFromStudyId(study.id);
  const book = slug ? getBibleBook(slug) : undefined;

  const nextDay = nextLessonDay(study, lessonDay);
  const next = nextDay != null ? findLesson(study, nextDay) : undefined;

  const payload: LessonPayloadC = {
    study: {
      id: study.id,
      type: study.type,
      kind: entry?.kind,
      title: study.title,
      lessonsTotal: study.lessons.length,
    },
    lesson: {
      day: lesson.day,
      title: lesson.title,
      minutes: lesson.estimatedMinutes ?? 12,
      focus: lesson.focus,
    },
    steps,
    passage,
    translation: study.startVersion,
    translations: versions.map((version) => ({
      id: version.id,
      name: version.name,
      language: version.language,
    })),
    content: {
      intro: content?.intro ?? null,
      readingCue: content?.word?.readingCue ?? null,
      depth: content?.depth ?? null,
      reflection: {
        question: resolveReflectionQuestion(lesson, content),
        prompts: content?.reflection?.prompts ?? [],
        placeholder: content?.reflection?.placeholder ?? null,
      },
      quizQuestionCount: content?.quiz?.questionCount ?? 5,
    },
    bookNote: book
      ? {
          author: book.author,
          written: book.written,
          genre: book.genre,
          section: sectionFor(book.outline, passage.chapter),
        }
      : null,
    next: nextDay != null && next ? { day: nextDay, title: next.title } : null,
  };

  return <LessonC payload={payload} demo={DEMO} />;
}
