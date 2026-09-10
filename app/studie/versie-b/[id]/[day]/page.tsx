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
import LessonB, {
  type LessonBDemo,
  type LessonBPayload,
} from '../../../../../components/study/variants/b/LessonB';

/**
 * Ontwerp B - "Dichter" - scherm 3 van 3: het lesscherm.
 *
 * Een BEOORDELINGS-URL naast /studie/[studyId]/[day]. Het statische segment
 * `versie-b` wint van het dynamische `[studyId]`, dus deze route lost op zonder
 * dat er iets aan de echte flow verandert.
 *
 * Alles wat hier wordt opgelost is statisch: de studie uit de catalogus, de
 * geschreven lesinhoud uit lib/data/study-lessons, de stappen en het gedeelte
 * uit lib/studyFlow, de vertalingenlijst uit de handleiding. Geen sessie, geen
 * inschrijving, geen StudyLessonState - dit scherm leest en schrijft niets van
 * een gebruiker. De bijbeltekst haalt de leeskolom zelf op in de browser, met
 * één GET.
 *
 * Het scherm erft app/studie/layout.tsx: geen appbalk, de icoonrail van 56px,
 * het ingesprongen ronde kader. De flow is een venster, geen pagina, en een
 * variant die dat verandert is niet meer vergelijkbaar met de andere twee.
 */

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, day } = await params;
  const study = findAnyStudy(id);
  const lesson = study ? findLesson(study, Number(day)) : undefined;
  return {
    title: `${lesson ? lesson.title : 'Les'} — ontwerp B (Dichter)`,
    robots: { index: false, follow: false },
  };
}

/**
 * DEMOGEGEVENS. Verzonnen en vast, nergens vandaan gelezen en nooit
 * teruggeschreven: hoeveel lessen van deze studie al af zijn, hoeveel dagen op
 * rij er gelezen is, en wat er al in het reflectieveld stond. Op de echte
 * pagina komt dit uit StudyProgress, de streak op de User en StudyLessonState.
 */
const DEMO: LessonBDemo = {
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

export default async function LessonBPage({ params }: PageProps) {
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

  const payload: LessonBPayload = {
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
    next: nextDay != null && nextLesson ? { day: nextDay, title: nextLesson.title } : null,
  };

  return <LessonB payload={payload} demo={DEMO} />;
}
