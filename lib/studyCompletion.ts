import connectMongoDB from './mongodb';
import StudyProgress from '../models/StudyProgress.js';
import Note from '../models/Note';
import { grantXp } from './gamification';
import { getChapter } from './local-data';
import { findAnyStudy } from './bookStudies';

/**
 * The one place a lesson is written to the completion ledger.
 *
 * `POST /api/v1/study-progress` and the study flow both call this rather than
 * writing StudyProgress themselves. That matters because lib/gamification.ts
 * COUNTS StudyProgress rows for badges, the profile and admin stats - two
 * writers means two chances to insert a row that is not actually a completion.
 */

export interface RecordLessonInput {
  userId: string;
  isPro: boolean;
  source: 'curated' | 'plan' | 'los';
  studyId: string | null;
  lessonDay: number | null;
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}

export interface RecordLessonResult {
  recorded: boolean;
  reason?: string;
  studyCompleted: boolean;
  xp: Awaited<ReturnType<typeof grantXp>> | null;
}

/**
 * Records one completed lesson and grants XP exactly once.
 *
 * The curated path claims the row with a single upsert instead of
 * findOne-then-create: two tabs finishing the same lesson used to both pass the
 * read, and the loser then threw on the unique index *after* the winner had
 * already been paid.
 */
export async function recordLessonCompletion(
  input: RecordLessonInput,
): Promise<RecordLessonResult> {
  await connectMongoDB();

  const fields = {
    userId: input.userId,
    source: input.source,
    studyId: input.studyId,
    lessonDay: input.lessonDay,
    book: input.book,
    chapter: input.chapter,
    verseStart: input.verseStart,
    verseEnd: input.verseEnd,
  };

  if (input.studyId && input.lessonDay != null) {
    const result = await StudyProgress.updateOne(
      { userId: input.userId, studyId: input.studyId, lessonDay: input.lessonDay },
      { $setOnInsert: { ...fields, completedAt: new Date() } },
      { upsert: true },
    );
    if (!result.upsertedCount) {
      return { recorded: false, reason: 'ALREADY_RECORDED', studyCompleted: false, xp: null };
    }
  } else {
    // A `los` passage has no dedupe key - studying the same chapter again is a
    // genuine second event, not a duplicate.
    await StudyProgress.create(fields);
  }

  const xp = await grantXp(input.userId, 'study_lesson', { isPro: input.isPro });

  // Finishing the last lesson of a curated study is its own milestone.
  let studyCompleted = false;
  if (input.studyId) {
    const study = findAnyStudy(input.studyId);
    if (study) {
      const done = (await StudyProgress.distinct('lessonDay', {
        userId: input.userId,
        studyId: input.studyId,
      })) as (number | null)[];
      const doneSet = new Set(done.filter((day): day is number => day != null));
      studyCompleted = study.lessons.every((lesson) => doneSet.has(lesson.day));

      if (studyCompleted) {
        const bonus = await grantXp(input.userId, 'study_completed', { isPro: input.isPro });
        xp.awarded += bonus.awarded;
        xp.xp = bonus.xp;
        xp.level = bonus.level;
        xp.levelledUp = xp.levelledUp || bonus.levelledUp;
        xp.newBadges = [...xp.newBadges, ...bonus.newBadges];
      }
    }
  }

  return { recorded: true, studyCompleted, xp };
}

/** Cap on how much scripture is copied into a promoted note. */
const MAX_VERSE_TEXT = 2000;

function referenceLabel(book: string, chapter: number, start: number | null, end: number | null) {
  if (start == null) return `${book} ${chapter}`;
  if (end == null || end === start) return `${book} ${chapter}:${start}`;
  return `${book} ${chapter}:${start}-${end}`;
}

/**
 * Reads the passage so a promoted note carries the text it is about.
 *
 * `Note.verseText` is required, and a note whose scripture says "(tekst niet
 * beschikbaar)" is nearly useless when you re-read it at /notities months later.
 */
async function readPassageText(
  translation: string,
  book: string,
  chapter: number,
  verseStart: number | null,
  verseEnd: number | null,
): Promise<string> {
  try {
    const data = await getChapter(translation, book, chapter);
    const verses = (data?.verses ?? null) as Record<string, string> | null;
    if (!verses) return '';

    const numbers = Object.keys(verses)
      .map((key) => Number(key))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    const from = verseStart ?? numbers[0];
    const to = verseEnd ?? verseStart ?? numbers[numbers.length - 1];

    const text = numbers
      .filter((n) => n >= from && n <= to)
      .map((n) => `${n}. ${verses[String(n)]}`)
      .join(' ')
      .trim();

    return text.length > MAX_VERSE_TEXT ? `${text.slice(0, MAX_VERSE_TEXT)}...` : text;
  } catch {
    // A missing or restricted translation must not block finishing a lesson.
    return '';
  }
}

export interface PromoteReflectionInput {
  userId: string;
  studyId: string;
  studyTitle: string;
  lessonTitle: string;
  question: string;
  reflection: string;
  translation: string;
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  tags?: string[];
  existingNoteId?: string | null;
}

/**
 * Turns a finished reflection into a real note.
 *
 * Drafts deliberately live on StudyLessonState until this point - promoting on
 * every keystroke would put every abandoned half-sentence in /notities. Once
 * promoted the note is an ordinary note: editable, searchable, and carried by
 * the existing mobile sync.
 */
export async function promoteReflectionToNote(
  input: PromoteReflectionInput,
): Promise<string | null> {
  const reflection = input.reflection.trim();
  if (!reflection) return null;

  await connectMongoDB();

  const verseText = await readPassageText(
    input.translation,
    input.book,
    input.chapter,
    input.verseStart,
    input.verseEnd,
  );

  const noteText = [`${input.question}`, '', reflection].join('\n');
  const tags = [...new Set(['studie', input.studyId, ...(input.tags ?? [])])];

  // Re-finishing a lesson updates the note it already produced rather than
  // leaving a trail of near-duplicates behind.
  if (input.existingNoteId) {
    const updated = await Note.findOneAndUpdate(
      { _id: input.existingNoteId, userId: input.userId },
      { $set: { noteText, tags, verseText: verseText || undefined } },
      { new: true },
    );
    if (updated) return String(updated._id);
  }

  const note = await Note.create({
    userId: input.userId,
    verseReference: referenceLabel(input.book, input.chapter, input.verseStart, input.verseEnd),
    book: input.book,
    chapter: input.chapter,
    verse: input.verseStart ?? undefined,
    verseEnd: input.verseEnd ?? undefined,
    // Required by the schema; the reference is a usable stand-in when the
    // translation could not be read (restricted content, missing file).
    verseText: verseText || referenceLabel(input.book, input.chapter, input.verseStart, input.verseEnd),
    translation: input.translation,
    noteText,
    tags,
    type: 'note',
    language: 'nl',
  });

  return String(note._id);
}
