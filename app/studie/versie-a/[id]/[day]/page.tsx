import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { bookSlugFromStudyId, findAnyStudy } from '../../../../../lib/bookStudies';
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
import TrouwLesson, {
  type TrouwLessonDemo,
  type TrouwLessonPayload,
} from '../../../../../components/study/variants/a/TrouwLesson';

/**
 * Ontwerp A - "trouw" - scherm 3 van 3: één les.
 *
 * EEN BEOORDELINGS-URL, en de reden dat hij kan bestaan is dat alles wat de
 * flow nodig heeft om beoordeeld te worden zonder database op te lossen is:
 * `findAnyStudy`, `getLessonContent`, `resolveSteps`, `resolvePassage` en
 * `getVersions` zijn puur of bestandsgebaseerd. De echte pagina leest daarnaast
 * de sessie, de inschrijving, StudyProgress en StudyLessonState; daar wordt hier
 * niets van aangeraakt, dus deze URL openen kan niets aanmaken, hervatten of
 * afronden.
 *
 * Het statische segment `versie-a` wint van het naastgelegen dynamische
 * `[studyId]`, dus /studie/versie-a/... lost hier op en elke echte les-URL lost
 * nog steeds op de echte pagina op.
 *
 * Het scherm erft app/studie/layout.tsx - geen appbalk, de 56px hover-rail, het
 * ingezette afgeronde kader - omdat de flow een venster is en geen appschil, en
 * een variant die dat veranderde zou niet met de andere te vergelijken zijn.
 */

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, day } = await params;
  const study = findAnyStudy(id);
  const lesson = study ? findLesson(study, Number(day)) : undefined;
  return {
    title: lesson ? `${lesson.title} - ontwerp A (trouw)` : 'Les - ontwerp A (trouw)',
    robots: { index: false, follow: false },
  };
}

/**
 * DEMOGEGEVENS. Verzonnen en vast: hoeveel lessen van deze studie al af zijn,
 * hoeveel dagen op rij er gelezen is, en wat er al in het reflectieveld stond.
 * Op de echte pagina komt dit uit StudyProgress, de streak op de User en
 * StudyLessonState. Hier wordt het nergens gelezen en nooit teruggeschreven.
 */
const DEMO: TrouwLessonDemo = {
  lessonsDone: 2,
  streak: 6,
  note: '',
};

/** Het onderdeel van de boekindeling waar dit hoofdstuk in valt. */
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

export default async function TrouwLessonPage({ params }: PageProps) {
  const { id, day } = await params;
  const lessonDay = Number(day);

  const study = findAnyStudy(id);
  if (!study || !Number.isInteger(lessonDay)) notFound();

  const lesson = findLesson(study, lessonDay);
  if (!lesson) notFound();

  const content = getLessonContent(study.id, lessonDay);
  const steps = resolveSteps(lesson, content);
  const passage = resolvePassage(lesson, content);

  const versions = await getVersions().catch(
    () => [] as { id: string; name: string; language: string }[],
  );

  const slug = bookSlugFromStudyId(study.id);
  const book = slug ? getBibleBook(slug) : undefined;

  const nextDay = nextLessonDay(study, lessonDay);
  const nextLesson = nextDay != null ? findLesson(study, nextDay) : undefined;

  const payload: TrouwLessonPayload = {
    study: {
      id: study.id,
      type: study.type,
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
    next:
      nextDay != null && nextLesson
        ? {
            day: nextDay,
            title: nextLesson.title,
            reference: `${nextLesson.book} ${nextLesson.chapter}${nextLesson.verseRange ? `:${nextLesson.verseRange}` : ''}`,
          }
        : null,
  };

  return <TrouwLesson payload={payload} demo={DEMO} />;
}
