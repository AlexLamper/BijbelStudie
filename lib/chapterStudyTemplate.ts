import type { BookGenre } from './content/bibleBooks';
import type { LessonContent } from './data/study-lessons/types';

/**
 * The prose every generated chapter lesson gets when nobody wrote any.
 *
 * A generated book study (boek-<slug>) used to open its Lezen step with no
 * reading cue and its Toepassing step with a single question, which is thin for
 * someone who opened one chapter on its own. The cue and the three prompts
 * below follow the observe / interpret / apply order and are written per
 * genre, because "let op wat Jezus zegt" is useless above a psalm. The three
 * practices are what the reader leaves with.
 *
 * These lines carry about 1200 generated chapter lessons, which is every
 * chapter of the canon nobody has written a study for. They are worth the same
 * care as authored prose.
 *
 * The Toepassing question itself is the lesson's `focus`, which
 * lib/bookStudies.ts rotates through `questions` below, one per chapter. It
 * used to rotate the book page's `studyQuestions`, but those are written for
 * a study of the whole book ("zoek de vijf redevoeringen op") and landed on
 * chapters they had nothing to do with. Authored content always wins, field
 * by field - see `mergeTemplateUnder`.
 *
 * Copy rule: Dutch, no em or en dashes and no spaced hyphens. Every question
 * is one short question in plain words: personal ("Wat betekent dit voor
 * jou") or answerable from the text itself, never two questions in one line,
 * never a term a new reader has to look up.
 */
export interface ChapterStudyTemplate {
  readingCue: string;
  /**
   * The Toepassing question, rotated per chapter. Has to fit ANY chapter of
   * the genre, because nobody wrote one for this chapter.
   */
  questions: string[];
  /** Exactly three, in the order notice, understand, apply. */
  prompts: [string, string, string];
  /**
   * Exactly three things to DO with this chapter this week.
   *
   * The Toepassing step asks a question and gets an answer; without these it
   * stops there, and a lesson that ends in a paragraph about yourself is not a
   * lesson that changes a week. Every line has to be startable today and
   * finishable without preparation, which rules out "overdenk" and "bid meer"
   * and rules in writing something down, telling someone, or doing the thing
   * the passage does.
   */
  practices: [string, string, string];
}

export const CHAPTER_STUDY_TEMPLATES: Record<BookGenre, ChapterStudyTemplate> = {
  Wet: {
    readingCue: 'Lees rustig en let op wat God van zijn volk vraagt, en waarom Hij dat vraagt.',
    questions: [
      'Welk gebod uit dit hoofdstuk valt jou het meest op?',
      'Wat vraagt God hier van zijn volk?',
      'Welk vers uit dit hoofdstuk wil jij deze week onthouden?',
      'Wat leer jij in dit hoofdstuk over hoe God is?',
      'Wat betekent dit hoofdstuk voor jouw leven van nu?',
    ],
    prompts: [
      'Wat valt je op als je dit hoofdstuk leest?',
      'Waarom vraagt God dit van zijn volk, denk je?',
      'Wat kun jij hier deze week mee doen?',
    ],
    practices: [
      'Kies een gebod uit dit hoofdstuk en let deze week op het moment waarop het je echt iets kost.',
      'Schrijf in hooguit drie zinnen op waarom God dit vraagt, in je eigen woorden.',
      'Vertel iemand deze week wat je opviel aan de manier waarop God met zijn volk omgaat.',
    ],
  },
  Geschiedenis: {
    readingCue: 'Lees het als een verhaal: wie handelt er, wat gebeurt er, en waar is God in het geheel?',
    questions: [
      'Welke persoon uit dit verhaal lijkt het meest op jou?',
      'Waar zie jij God aan het werk in dit hoofdstuk?',
      'Welke keuze uit dit verhaal had jij anders gemaakt?',
      'Welk moment uit dit hoofdstuk blijft je het meest bij?',
      'Wat leer jij van dit verhaal voor je eigen leven?',
    ],
    prompts: [
      'Wie zijn de belangrijkste personen in dit verhaal?',
      'Waar zie je dat God trouw blijft, ook als mensen fouten maken?',
      'Wat neem jij mee uit dit verhaal?',
    ],
    practices: [
      'Noem de persoon uit dit hoofdstuk op wie jij het meest lijkt, en schrijf op waarin.',
      'Zoek deze week een keuze in je eigen leven die lijkt op de keuze in dit hoofdstuk.',
      'Vertel dit verhaal een keer na aan iemand anders, zonder het boek erbij.',
    ],
  },
  'Poëzie en wijsheid': {
    readingCue: 'Lees langzaam, en als het kan hardop. Let op beelden, herhalingen en de toon van de woorden.',
    questions: [
      'Welk vers uit dit gedeelte raakt jou het meest?',
      'Welk gevoel uit dit gedeelte herken jij bij jezelf?',
      'Welk beeld uit de tekst blijft je bij?',
      'Wat wil jij God zeggen na het lezen van dit gedeelte?',
      'Welke wijze les uit dit gedeelte heb jij deze week nodig?',
    ],
    prompts: [
      'Welke beelden of woorden komen steeds terug?',
      'Wat voelt of denkt de schrijver hier?',
      'Welk vers neem jij deze week mee?',
    ],
    practices: [
      'Leer een vers uit dit gedeelte uit je hoofd en zeg het deze week elke dag een keer.',
      'Lees het hoofdstuk nog een keer hardop, op een moment dat je alleen bent.',
      'Schrijf een paar eigen regels in dezelfde toon: klacht, dank of vertrouwen.',
    ],
  },
  'Grote profeten': {
    readingCue: 'Let op tot wie de profeet spreekt, welke aanklacht hij brengt en welke belofte er klinkt.',
    questions: [
      'Welke belofte uit dit hoofdstuk wil jij onthouden?',
      'Waar roept dit hoofdstuk jou op om iets te veranderen?',
      'Wat leer jij in dit hoofdstuk over hoe God is?',
      'Welk vers uit dit hoofdstuk geeft jou hoop?',
      'Waar zie jij vandaag iets terug van wat de profeet hier beschrijft?',
    ],
    prompts: [
      'Tegen wie spreekt de profeet in dit hoofdstuk?',
      'Wat belooft God in dit hoofdstuk?',
      'Wat zegt dit hoofdstuk tegen jou?',
    ],
    practices: [
      'Schrijf op welke aanklacht uit dit hoofdstuk ook over jouw leven zou kunnen gaan.',
      'Zoek deze week een bericht in het nieuws waarin je hetzelfde onrecht herkent.',
      'Neem een belofte uit dit hoofdstuk mee naar het moment waarop je die het hardst nodig hebt.',
    ],
  },
  'Kleine profeten': {
    readingCue: 'Een korte profetie met een scherpe boodschap. Let op waar het volk van God is afgedwaald.',
    questions: [
      'Wat wil God dat zijn volk anders gaat doen?',
      'Waar herken jij jezelf in de boodschap van dit hoofdstuk?',
      'Welk vers uit dit hoofdstuk blijft je het meest bij?',
      'Wat leer jij hier over hoe God is?',
      'Wat betekent deze boodschap voor jou vandaag?',
    ],
    prompts: [
      'Welke woorden komen steeds terug in dit hoofdstuk?',
      'Wat doet het volk verkeerd volgens de profeet?',
      'Waar zie jij deze boodschap terug in je eigen leven?',
    ],
    practices: [
      'Benoem een gewoonte waarvan je zelf weet dat die niet klopt, en zet deze week een eerste stap.',
      'Lees dit hele bijbelboek deze week in een keer uit, het is kort genoeg.',
      'Schrijf op wat God volgens dit hoofdstuk het liefst wil bereiken bij zijn volk.',
    ],
  },
  Evangelie: {
    readingCue: 'Let op wat Jezus zegt en doet, en hoe de mensen om Hem heen reageren.',
    questions: [
      'Wat doet Jezus in dit hoofdstuk dat jou raakt?',
      'Met wie uit dit hoofdstuk voel jij je het meest verbonden?',
      'Welke woorden van Jezus wil jij deze week onthouden?',
      'Wat leer jij hier over wie Jezus is?',
      'Wat zou Jezus met dit hoofdstuk tegen jou willen zeggen?',
    ],
    prompts: [
      'Wat zegt en doet Jezus in dit hoofdstuk?',
      'Hoe reageren de mensen om Hem heen?',
      'Hoe zou jij gereageerd hebben als je erbij was?',
    ],
    practices: [
      'Doe deze week een keer op jouw schaal wat Jezus in dit hoofdstuk doet.',
      'Schrijf op met welke persoon uit dit hoofdstuk jij jezelf vergelijkt, en waarom.',
      'Vertel iemand deze week in je eigen woorden wat Jezus hier zegt.',
    ],
  },
  Brief: {
    readingCue: 'Volg de redenering van de schrijver. Let op woorden als daarom, want en maar.',
    questions: [
      'Welke zin uit dit hoofdstuk is voor jou het belangrijkst?',
      'Wat wil de schrijver dat zijn lezers gaan doen?',
      'Welke opdracht uit dit hoofdstuk kun jij deze week doen?',
      'Waar geeft dit hoofdstuk jou troost of moed?',
      'Wat betekent dit hoofdstuk voor jouw leven van nu?',
    ],
    prompts: [
      'Waar gaat dit hoofdstuk vooral over?',
      'Welke woorden of zinnen komen steeds terug?',
      'Wat kun jij hier deze week mee doen?',
    ],
    practices: [
      'Schrijf de hoofdgedachte van dit hoofdstuk op in een zin en leg die ergens neer waar je hem ziet.',
      'Kies een opdracht uit dit hoofdstuk en voer die deze week een keer concreet uit.',
      'Zoek iemand voor wie de troost uit dit hoofdstuk nodig is, en deel die met hem of haar.',
    ],
  },
  Apocalyptiek: {
    readingCue: 'Lees de beelden niet te snel. Vraag steeds wat ze zeggen over de overwinning van God.',
    questions: [
      'Welk beeld uit dit hoofdstuk blijft je het meest bij?',
      'Waar geeft dit hoofdstuk jou hoop?',
      'Wat leer jij hier over de macht van God?',
      'Welk vers wil jij onthouden als het moeilijk wordt?',
      'Wat betekent het voor jou dat God het laatste woord heeft?',
    ],
    prompts: [
      'Welke beelden en personen zie je in dit hoofdstuk?',
      'Wat laten deze beelden zien over God?',
      'Hoe helpt dit hoofdstuk jou in wat je nu meemaakt?',
    ],
    practices: [
      'Schrijf in een zin op wat dit hoofdstuk zegt over hoe de geschiedenis afloopt.',
      'Kies een beeld uit dit hoofdstuk en zoek deze week op waar het vandaan komt.',
      'Noem een zorg van jezelf die kleiner wordt als dit hoofdstuk waar is.',
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
    practices: reflection?.practices?.length ? reflection.practices : [...template.practices],
  };
  return merged;
}
