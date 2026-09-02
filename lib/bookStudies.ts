import { BIBLE_BOOKS, readerBookName, type BibleBook } from './content/bibleBooks';
import { curatedStudies, type CuratedStudy, type Lesson } from './data/curated-studies';

/**
 * Every bible book, as a study.
 *
 * WHY THIS EXISTS
 * /studies used to hold two different things: eleven hand-authored studies, and
 * a browser over the sixty-six books that sent you off to /lezen. From the
 * reader's side that is one question - "wat ga ik bestuderen?" - answered in two
 * incompatible ways, one of which quietly left the study flow altogether.
 *
 * So every book is a study now. The generated ones carry no authored intro and
 * no quiz, and the flow already handles both absences: `resolveSteps` drops the
 * intro when unauthored, and the quiz step renders its own empty state. What is
 * left - read the chapter, read the commentary, reflect on it, ask the
 * assistant - works for all sixty-six without a word being written.
 *
 * Where a book HAS an authored study (Daniël), that study is used instead of the
 * generated one, so the richer version is what a reader finds.
 */

/** Generated ids are prefixed so they can never collide with an authored id. */
export const BOOK_STUDY_PREFIX = 'boek-';

export function bookStudyId(slug: string): string {
  return `${BOOK_STUDY_PREFIX}${slug}`;
}

export function isBookStudyId(id: string): boolean {
  return id.startsWith(BOOK_STUDY_PREFIX);
}

/**
 * The reflection question when a chapter has no authored one.
 *
 * Deliberately answerable about any passage in the canon, and deliberately not
 * a comprehension check - the flow already has a quiz step for that.
 */
const GENERIC_QUESTION =
  'Wat laat dit hoofdstuk zien over wie God is, en wat vraagt dat van jou?';

/** Twelve minutes is the authored default; a single chapter is a shorter sit. */
const MINUTES_PER_CHAPTER = 10;

/** The outline section a chapter falls in, for a lesson title with meaning. */
function sectionFor(book: BibleBook, chapter: number): string | null {
  for (const section of book.outline) {
    const [rawStart, rawEnd] = section.range.split(/[-–—]/);
    const start = parseInt(rawStart, 10);
    const end = parseInt(rawEnd ?? rawStart, 10);
    if (Number.isNaN(start)) continue;
    // Sections may overlap (Markus has "1-8" and "8-10"); first match wins,
    // which keeps the titles in reading order.
    if (chapter >= start && chapter <= (Number.isNaN(end) ? start : end)) {
      return section.title;
    }
  }
  return null;
}

/**
 * One lesson per chapter, in order.
 *
 * The authored `studyQuestions` are rotated through rather than used once: they
 * are written to push a reader into the text of THIS book, so they are worth
 * more spread across it than spent on the first three chapters. Books without
 * them fall back to the generic question.
 */
function generateLessons(book: BibleBook): Lesson[] {
  const questions = book.studyQuestions.length > 0 ? book.studyQuestions : [GENERIC_QUESTION];
  const readerBook = readerBookName(book);

  return Array.from({ length: book.chapters }, (_, index) => {
    const chapter = index + 1;
    const section = sectionFor(book, chapter);
    return {
      day: chapter,
      title: section ? `${chapter}. ${section}` : `Hoofdstuk ${chapter}`,
      book: readerBook,
      chapter,
      focus: questions[index % questions.length],
      estimatedMinutes: MINUTES_PER_CHAPTER,
    };
  });
}

export function generateBookStudy(book: BibleBook): CuratedStudy {
  return {
    id: bookStudyId(book.slug),
    type: 'Boek',
    title: book.name,
    description: book.theme,
    durationLabel: `${book.chapters} ${book.chapters === 1 ? 'les' : 'lessen'}`,
    startBook: readerBookName(book),
    startChapter: 1,
    startVersion: 'statenvertaling',
    // Authored studies have a hand-drawn SVG banner; the unified catalogue does
    // not show cover art, so a generated study has nothing to carry here.
    image: '',
    lessons: generateLessons(book),
    about: book.summary.slice(0, 2),
    suggestedRhythm: 'dagelijks',
    suggestedDepth: 'kort',
  };
}

/**
 * An authored study that covers a whole book, keyed by the book it covers.
 *
 * Only type 'Boek' qualifies. A study ABOUT a book's subject (the Psalmen
 * study is an 'Onderwerp' walking through eight psalms) is not a replacement
 * for studying the book itself.
 */
const AUTHORED_BY_BOOK = new Map(
  curatedStudies.filter((study) => study.type === 'Boek').map((study) => [study.startBook, study]),
);

export interface BookStudyEntry {
  book: BibleBook;
  study: CuratedStudy;
  /** True when the study is hand-authored, so it also has an intro and a quiz. */
  authored: boolean;
}

/**
 * All 66 books in canonical order, each paired with the best study for it.
 *
 * The pair is exported rather than just the study because the catalogue sorts
 * and labels by testament and genre, which live on the book - and Daniël's
 * study is an authored one whose id gives no way back to the book.
 */
export const BOOK_STUDY_ENTRIES: BookStudyEntry[] = BIBLE_BOOKS.map((book) => {
  const authored = AUTHORED_BY_BOOK.get(readerBookName(book)) ?? AUTHORED_BY_BOOK.get(book.name);
  return { book, study: authored ?? generateBookStudy(book), authored: !!authored };
});

export const BOOK_STUDIES: CuratedStudy[] = BOOK_STUDY_ENTRIES.map((entry) => entry.study);

/** The authored studies that are not a whole book: a person, a passage, a theme. */
export const THEME_STUDIES: CuratedStudy[] = curatedStudies.filter((study) => study.type !== 'Boek');

/** Books first, themes after - the order the catalogue renders in. */
export const ALL_STUDIES: CuratedStudy[] = [...BOOK_STUDIES, ...THEME_STUDIES];

const BY_ID = new Map(ALL_STUDIES.map((study) => [study.id, study]));

/**
 * Resolve any study id: authored or generated.
 *
 * Every surface that turns an id back into a study goes through here, so an
 * enrollment in Genesis behaves exactly like an enrollment in Daniël.
 */
export function findAnyStudy(studyId: string): CuratedStudy | null {
  return BY_ID.get(studyId) ?? null;
}

/** The book a generated study id points at, or null for authored ids. */
export function bookSlugFromStudyId(studyId: string): string | null {
  return isBookStudyId(studyId) ? studyId.slice(BOOK_STUDY_PREFIX.length) : null;
}

/**
 * How the catalogue groups a study.
 *
 * `category` is the coarse bucket the browse rail offers; `kind` is the one-word
 * label above a group ("Wet", "Evangelie", "Persoon"). Both live here rather
 * than on the page because /studies and the app's /api/v1/studies/catalog have
 * to agree on them - a study that is a "Profeten" book on the website must not
 * be something else in the app.
 */
export type StudyCategory = 'ot' | 'nt' | 'personen' | 'themas';

/** Minutes assumed for a lesson that carries no estimate of its own. */
export const MINUTES_FALLBACK = 12;

export interface CatalogueEntry {
  study: CuratedStudy;
  /** The book behind a bible-book study; absent for theme/person/passage ones. */
  book?: BibleBook;
  /** "Wet", "Evangelie", "Persoon" - what kind of thing this is, in one word. */
  kind: string;
  category: StudyCategory;
  lessonCount: number;
  /** Average minutes per lesson; lessons without an estimate take the fallback. */
  avgMinutes: number;
}

/** Mean minutes per lesson, rounded. */
export function avgMinutesOf(study: CuratedStudy): number {
  const total = study.lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes ?? MINUTES_FALLBACK),
    0,
  );
  return Math.round(total / (study.lessons.length || 1));
}

/** Every study with its grouping metadata - books first, themes after. */
export const CATALOGUE_ENTRIES: CatalogueEntry[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => ({
    study,
    book,
    kind: book.genre,
    category: (book.testament === 'oude-testament' ? 'ot' : 'nt') as StudyCategory,
    lessonCount: study.lessons.length,
    avgMinutes: avgMinutesOf(study),
  })),
  ...THEME_STUDIES.map((study) => {
    const isPerson = study.type === 'Persoon';
    return {
      study,
      kind: isPerson ? 'Persoon' : study.type === 'Gedeelte' ? 'Gedeelte' : 'Thema',
      category: (isPerson ? 'personen' : 'themas') as StudyCategory,
      lessonCount: study.lessons.length,
      avgMinutes: avgMinutesOf(study),
    };
  }),
];
