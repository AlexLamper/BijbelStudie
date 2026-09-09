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
import VenstersLesson, {
  type DemoQuizQuestion,
} from '../../../../../components/study/variants/vensters/VenstersLesson';

interface PageProps {
  params: Promise<{ id: string; day: string }>;
}

/**
 * Design variant 2 - "Vensters" - screen 3 of 3: one lesson.
 *
 * A REVIEW URL, and the reason it can exist at all is that everything the flow
 * needs to be judged is resolvable without a database: `findAnyStudy`,
 * `getLessonContent`, `resolveSteps`, `resolvePassage` and `getVersions` are all
 * pure or file-backed. The real page additionally reads the session, the
 * enrollment, StudyProgress and StudyLessonState; none of that is touched here,
 * so opening this URL cannot create, resume or complete anything.
 *
 * It inherits app/studie/layout.tsx - no app header, the 56px hover rail, the
 * inset rounded frame - because the flow is a window, not the app shell, and a
 * variant that changed that would not be comparable with the other three.
 *
 * Static `versie-2` wins over the sibling `[studyId]` segment, so /studie/versie-2/...
 * resolves here and every real lesson URL still resolves to the real page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, day } = await params;
  const study = findAnyStudy(id);
  const lesson = study ? findLesson(study, Number(day)) : undefined;
  return {
    title: `${lesson ? lesson.title : 'Les'} — ontwerp 2 (Vensters)`,
    robots: { index: false, follow: false },
  };
}

/**
 * DEMO DATA. Questions for the demo study only, keyed `studyId:day`.
 *
 * The real Toetsing step calls `GET /api/v1/study-quiz`, which persists the
 * questions it served to StudyLessonState so the grade call can be checked
 * against them - a write, and therefore out of bounds for a preview. These
 * three are written by hand against the same passage so the card, the dots,
 * the review and the score all have something real to render. Any other lesson
 * falls through to the empty list, which is a state the real step has to handle
 * too: the question bank simply has nothing for that passage yet.
 */
const DEMO_QUIZ: Record<string, DemoQuizQuestion[]> = {
  'opstanding:1': [
    {
      id: 'q1',
      text: 'Wie komt in Johannes 20 als eerste bij het graf?',
      answers: [
        { id: 'a', text: 'Petrus' },
        { id: 'b', text: 'Maria Magdalena' },
        { id: 'c', text: 'De andere discipel' },
        { id: 'd', text: 'Thomas' },
      ],
      correctId: 'b',
      explanation:
        'Johannes noemt haar bij name, en het is nog donker. Dat vrouwen de eerste getuigen zijn, maakt het verslag geloofwaardiger: hun getuigenis telde destijds nauwelijks mee voor de rechtbank.',
    },
    {
      id: 'q2',
      text: 'Wat treffen de discipelen aan in het graf?',
      answers: [
        { id: 'a', text: 'Een lege ruimte, verder niets' },
        { id: 'b', text: 'De linnen doeken, met de zweetdoek apart opgerold' },
        { id: 'c', text: 'Twee engelen die niets zeggen' },
        { id: 'd', text: 'De weggerolde steen binnenin' },
      ],
      correctId: 'b',
      explanation:
        'Een geroofd lichaam neem je mee inclusief de doeken. Dat ze blijven liggen — en de zweetdoek apart opgerold — wijst op orde, niet op haast.',
    },
    {
      id: 'q3',
      text: 'Waaraan herkent Maria Jezus uiteindelijk?',
      answers: [
        { id: 'a', text: 'Aan de wonden in zijn handen' },
        { id: 'b', text: 'Aan zijn kleding' },
        { id: 'c', text: 'Doordat Hij haar naam noemt' },
        { id: 'd', text: 'Doordat de engelen het zeggen' },
      ],
      correctId: 'c',
      explanation:
        'Ze denkt dat Hij de tuinman is tot Hij "Maria" zegt. Het horen gaat hier vóór het zien — precies de spanning die de reflectievraag oppakt.',
    },
  ],
  'opstanding:2': [
    {
      id: 'q1',
      text: 'Wat vraagt Thomas voordat hij gelooft?',
      answers: [
        { id: 'a', text: 'Een teken uit de hemel' },
        { id: 'b', text: 'Zien en aanraken — precies wat de anderen al kregen' },
        { id: 'c', text: 'Dat Jezus het aan de Schriften bewijst' },
        { id: 'd', text: 'Dat Petrus het bevestigt' },
      ],
      correctId: 'b',
      explanation: 'Zijn eis is niet groter dan de ervaring die de andere discipelen al hadden.',
    },
    {
      id: 'q2',
      text: 'Welke belijdenis spreekt Thomas uit?',
      answers: [
        { id: 'a', text: '"Mijn Heere en mijn God"' },
        { id: 'b', text: '"Gij zijt de Christus"' },
        { id: 'c', text: '"Rabbouni"' },
        { id: 'd', text: '"Heere, tot wien zullen wij heengaan?"' },
      ],
      correctId: 'a',
      explanation:
        'De sterkste belijdenis in het Johannes-evangelie. Johannes opent met "het Woord was God" en sluit de kring hier.',
    },
    {
      id: 'q3',
      text: 'Waarom heeft Johannes dit opgeschreven, zegt hij zelf in vers 31?',
      answers: [
        { id: 'a', text: 'Om alles vast te leggen wat Jezus deed' },
        { id: 'b', text: 'Om de andere evangeliën aan te vullen' },
        { id: 'c', text: 'Opdat je gelooft, en leven hebt in zijn naam' },
        { id: 'd', text: 'Om Thomas te verdedigen' },
      ],
      correctId: 'c',
      explanation: 'Johannes noemt zijn doel expliciet: geloof, en daardoor leven.',
    },
  ],
  'opstanding:3': [
    {
      id: 'q1',
      text: 'Naar welke psalm verwijst Petrus in zijn toespraak?',
      answers: [
        { id: 'a', text: 'Psalm 16' },
        { id: 'b', text: 'Psalm 22' },
        { id: 'c', text: 'Psalm 110' },
        { id: 'd', text: 'Psalm 2' },
      ],
      correctId: 'a',
      explanation: '"Gij zult mijn ziel in de hel niet verlaten" — Petrus leest die woorden als spreken over de opstanding.',
    },
    {
      id: 'q2',
      text: 'Welk argument gebruikt Petrus over David?',
      answers: [
        { id: 'a', text: 'Dat David de psalm niet zelf schreef' },
        { id: 'b', text: 'Dat David gestorven en begraven is, en zijn graf er nog steeds is' },
        { id: 'c', text: 'Dat David de Messias voorspelde in een droom' },
        { id: 'd', text: 'Dat David zelf opstond uit de dood' },
      ],
      correctId: 'b',
      explanation: 'Dus kan de psalm niet over David zelf gaan — hij spreekt over iemand ná hem.',
    },
    {
      id: 'q3',
      text: 'Waarmee sluit Petrus zijn betoog af?',
      answers: [
        { id: 'a', text: 'Met een oproep tot de tempeldienst' },
        { id: 'b', text: 'Met een waarschuwing aan de Romeinen' },
        { id: 'c', text: 'Dat God Hem tot Heere en Christus gemaakt heeft' },
        { id: 'd', text: 'Met de belofte van een nieuwe tempel' },
      ],
      correctId: 'c',
      explanation: 'De opstanding is bij Petrus geen los wonder maar de bevestiging van wie Jezus is.',
    },
  ],
};

export default async function VenstersLessonPage({ params }: PageProps) {
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

  const nextDay = nextLessonDay(study, lessonDay);
  const next = nextDay != null ? findLesson(study, nextDay) : undefined;

  return (
    <VenstersLesson
      study={{
        id: study.id,
        type: study.type,
        kind: entry?.kind,
        title: study.title,
        lessonsTotal: study.lessons.length,
      }}
      lesson={{
        day: lesson.day,
        title: lesson.title,
        minutes: lesson.estimatedMinutes ?? 12,
      }}
      steps={steps}
      passage={passage}
      translation={study.startVersion}
      translations={versions.map((version) => ({
        id: version.id,
        name: version.name,
        language: version.language,
      }))}
      commentaryId={resolveCommentaryId({})}
      content={{
        intro: content?.intro ?? null,
        readingCue: content?.word?.readingCue ?? null,
        depth: content?.depth ?? null,
        reflection: {
          question: resolveReflectionQuestion(lesson, content),
          prompts: content?.reflection?.prompts ?? [],
          placeholder: content?.reflection?.placeholder ?? null,
        },
      }}
      quiz={DEMO_QUIZ[`${study.id}:${lessonDay}`] ?? []}
      nextLesson={
        next
          ? {
              day: next.day,
              title: next.title,
              reference: `${next.book} ${next.chapter}${next.verseRange ? `:${next.verseRange}` : ''}`,
            }
          : null
      }
      /* DEMO DATA: the real close reads the XP the API awarded and the streak
         from the User document. Fixed here so the closing beat has figures. */
      reward={{ xp: 40, streak: 12 }}
    />
  );
}
