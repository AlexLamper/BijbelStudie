import type { BookGenre } from './content/bibleBooks';
import type { LessonContent } from './data/study-lessons/types';

/**
 * The prose every generated chapter lesson gets when nobody wrote any.
 *
 * A generated book study (boek-<slug>) used to open its Woord step with no
 * reading cue and its Reflectie step with a single question, which is thin for
 * someone who opened one chapter on its own. The cue and the three prompts
 * below follow the observe / interpret / apply order and are written per
 * genre, because "let op wat Jezus zegt" is useless above a psalm.
 *
 * Deliberately NO reflection question: the lesson's own `focus` (a rotated
 * study question of that book) stays the question, and these prompts sit
 * under it. Authored content always wins, field by field - see
 * `mergeTemplateUnder`.
 *
 * Copy rule: Dutch, no em or en dashes and no spaced hyphens.
 */
export interface ChapterStudyTemplate {
  readingCue: string;
  /** Exactly three: waarnemen, uitleggen, toepassen. */
  prompts: [string, string, string];
}

export const CHAPTER_STUDY_TEMPLATES: Record<BookGenre, ChapterStudyTemplate> = {
  Wet: {
    readingCue: 'Lees rustig en let op wat God van zijn volk vraagt, en waarom Hij dat vraagt.',
    prompts: [
      'Waarnemen: welke geboden, gebeurtenissen of herhalingen vallen je op in dit hoofdstuk?',
      'Uitleggen: wat zegt dit over de heiligheid van God en over zijn verbond met Israël?',
      'Toepassen: hoe wijst dit hoofdstuk vooruit naar Christus, en wat betekent dat voor jou vandaag?',
    ],
  },
  Geschiedenis: {
    readingCue: 'Lees het als een verhaal: wie handelt er, wat gebeurt er, en waar is God in het geheel?',
    prompts: [
      'Waarnemen: wie zijn de hoofdpersonen, en welke keuzes maken ze?',
      'Uitleggen: wat laat dit verhaal zien over de trouw van God, ook waar mensen tekortschieten?',
      'Toepassen: in welke persoon of keuze herken je iets van jezelf, en wat neem je daarvan mee?',
    ],
  },
  'Poëzie en wijsheid': {
    readingCue: 'Lees langzaam, en als het kan hardop. Let op beelden, herhalingen en de toon van de woorden.',
    prompts: [
      'Waarnemen: welke beelden en herhalingen gebruikt de schrijver?',
      'Uitleggen: welke gevoelens of welke wijsheid brengt hij onder woorden, en wat zegt dat over God?',
      'Toepassen: welk vers neem je deze week mee in je gebed of in een keuze die je maakt?',
    ],
  },
  'Grote profeten': {
    readingCue: 'Let op tot wie de profeet spreekt, welke aanklacht hij brengt en welke belofte er klinkt.',
    prompts: [
      'Waarnemen: tot wie spreekt de profeet, en in welke situatie?',
      'Uitleggen: welke oordelen en welke beloften staan hier naast elkaar, en wat zeggen ze over God?',
      'Toepassen: waar roept dit hoofdstuk jou op tot omkeer of tot vertrouwen?',
    ],
  },
  'Kleine profeten': {
    readingCue: 'Een korte profetie met een scherpe boodschap. Let op waar het volk van God is afgedwaald.',
    prompts: [
      'Waarnemen: welke zonde wordt genoemd, en welke woorden keren steeds terug?',
      'Uitleggen: wat wil God met deze boodschap bij zijn volk bereiken?',
      'Toepassen: waar klinkt deze roepstem ook in jouw leven of in de kerk van nu?',
    ],
  },
  Evangelie: {
    readingCue: 'Let op wat Jezus zegt en doet, en hoe de mensen om Hem heen reageren.',
    prompts: [
      'Waarnemen: wat zegt en doet Jezus in dit hoofdstuk, en wie zijn erbij?',
      'Uitleggen: wat laat dit zien over wie Jezus is en over het koninkrijk van God?',
      'Toepassen: hoe zou jij gereageerd hebben als je erbij was, en wat vraagt Hij nu van jou?',
    ],
  },
  Brief: {
    readingCue: 'Volg de redenering van de schrijver. Let op woorden als daarom, want en maar.',
    prompts: [
      'Waarnemen: wat is de hoofdgedachte van dit hoofdstuk, en welke woorden keren terug?',
      'Uitleggen: wat wilde de schrijver de eerste lezers leren of op het hart drukken?',
      'Toepassen: welke opdracht of troost uit dit hoofdstuk geldt ook voor jou vandaag?',
    ],
  },
  Apocalyptiek: {
    readingCue: 'Lees de beelden niet te snel. Vraag steeds wat ze zeggen over de overwinning van God.',
    prompts: [
      'Waarnemen: welke beelden, getallen en personen komen in dit hoofdstuk voor?',
      'Uitleggen: wat zeggen deze beelden over de macht van God en over de afloop van de geschiedenis?',
      'Toepassen: hoe geeft dit hoofdstuk jou hoop of houvast in wat je nu meemaakt?',
    ],
  },
};

export function chapterStudyTemplate(genre: BookGenre): ChapterStudyTemplate {
  return CHAPTER_STUDY_TEMPLATES[genre];
}

/**
 * The template as lesson content, with `authored` laid over it.
 *
 * Field by field rather than all or nothing: an authored reflection without
 * prompts keeps its own question and still gets the template prompts, while an
 * authored reading cue simply replaces the template one. The empty template
 * question is never shown - `resolveReflectionQuestion` falls back to the
 * lesson's `focus` for a blank one.
 */
export function mergeTemplateUnder(
  template: ChapterStudyTemplate,
  authored: LessonContent | undefined,
): LessonContent {
  const merged: LessonContent = { ...(authored ?? {}) };
  merged.word = {
    ...(authored?.word ?? {}),
    readingCue: authored?.word?.readingCue || template.readingCue,
  };

  const reflection = authored?.reflection;
  merged.reflection = {
    ...(reflection ?? {}),
    question: reflection?.question ?? '',
    prompts: reflection?.prompts?.length ? reflection.prompts : [...template.prompts],
  };
  return merged;
}
