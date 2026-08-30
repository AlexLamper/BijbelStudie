import {
  BIBLE_BOOKS,
  readerBookName,
  readerHref,
  type BibleBook,
} from '../../lib/content/bibleBooks'
import { bookNameMap, normalizeBookName } from '../../lib/book-mapping'
import { curatedStudies, type CuratedStudy } from '../../lib/data/curated-studies'

/**
 * The plumbing behind the book browser on /studies: which book a name refers
 * to, which chapters the reader has already been through, and which curated
 * study - if any - already walks the passage someone just picked.
 *
 * `BIBLE_BOOKS` is the canon table here rather than `PLAN_BOOKS` from
 * planCanon. Both list all 66 books, but only BIBLE_BOOKS carries the
 * `outline` sections ("5-7 De Bergrede") that make a chapter range worth
 * offering in one tap, the `theme` line, and `appBook` - the spelling the
 * reader's data files actually use. A /lezen link built from the display name
 * lands on nothing for 2 Corinthiërs.
 */

/** Slug-keyed, because the same book reaches us under four spellings. */
export type ChaptersReadBySlug = Record<string, number[]>

export interface PassageSelection {
  slug: string
  start: number
  end: number
}

export interface SavedPassage extends PassageSelection {
  savedAt: string
}

export interface StudyOverlap {
  study: CuratedStudy
  /** Chapters of this book the study actually visits, ascending. */
  chapters: number[]
}

export interface RangeMatch extends StudyOverlap {
  /** How many of the selected chapters the study visits. */
  overlap: number
  /** `overlap` as a share of the selection, 0-1. */
  coverage: number
}

/**
 * Diacritic-insensitive key. The repo spells the same book as "Daniël",
 * "Daniel", "1 Samuël" and "1 Samuel" depending on which file you are in, and
 * `readChapters` keys come straight from whatever the reader was handed at the
 * time, so an exact-match lookup misses far too often.
 */
function fold(name: string): string {
  let stripped = ''
  for (const char of name.normalize('NFD')) {
    const code = char.charCodeAt(0)
    // Skip the combining marks NFD splits the accents off into, by code point
    // rather than by a regex range - a literal combining character in source is
    // invisible and does not survive hand-editing.
    if (code >= 0x0300 && code <= 0x036f) continue
    stripped += char
  }
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim()
}

const BY_KEY = new Map<string, BibleBook>()
const BY_ENGLISH = new Map<string, BibleBook>()

for (const book of BIBLE_BOOKS) {
  const reader = readerBookName(book)
  for (const key of [book.slug, book.name, reader]) {
    BY_KEY.set(fold(key), book)
  }
  // normalizeBookName returns its input unchanged when it does not recognise
  // it, so these are English names where one exists and harmless duplicates of
  // the Dutch key otherwise.
  BY_ENGLISH.set(fold(normalizeBookName(book.name)), book)
  BY_ENGLISH.set(fold(normalizeBookName(reader)), book)
}

// Every Dutch and German spelling the repo has ever written to the database,
// folded onto the same book. Keys already set win: the display spelling is the
// one we want back out.
for (const [alias, english] of Object.entries(bookNameMap)) {
  const book = BY_ENGLISH.get(fold(english))
  if (book && !BY_KEY.has(fold(alias))) BY_KEY.set(fold(alias), book)
}
for (const [english, book] of BY_ENGLISH) {
  if (!BY_KEY.has(english)) BY_KEY.set(english, book)
}

/** Accepts a slug or any Dutch/English spelling the repo uses. */
export function resolveBook(name: string | null | undefined): BibleBook | undefined {
  if (!name || typeof name !== 'string') return undefined
  return BY_KEY.get(fold(name))
}

/**
 * `User.readChapters` into something safe to render.
 *
 * That map has carried garbage: a Mongoose full-save once wrote the schema
 * path `$*` into it as a literal key (see the note in app/api/checkout/route.ts),
 * and `$`-prefixed and dotted keys are still in production documents. Anything
 * that is not a book we recognise, holding an array of real chapter numbers
 * inside that book, is dropped rather than drawn.
 */
export function sanitizeReadChapters(raw: unknown): ChaptersReadBySlug {
  const out: ChaptersReadBySlug = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.startsWith('$') || key.includes('.')) continue
    if (!Array.isArray(value)) continue
    const book = resolveBook(key)
    if (!book) continue

    const merged = new Set(out[book.slug] ?? [])
    for (const entry of value) {
      if (typeof entry !== 'number' || !Number.isFinite(entry)) continue
      const chapter = Math.trunc(entry)
      if (chapter < 1 || chapter > book.chapters) continue
      merged.add(chapter)
    }
    if (merged.size > 0) out[book.slug] = [...merged].sort((a, b) => a - b)
  }

  return out
}

/**
 * Which curated studies touch which book.
 *
 * A study is indexed under every book its lessons visit, not just `startBook`,
 * so picking Handelingen finds the Paulus study even though that study opens
 * in a different book.
 */
const STUDIES_BY_SLUG = (() => {
  const map = new Map<string, StudyOverlap[]>()

  for (const study of curatedStudies) {
    const perBook = new Map<string, Set<number>>()
    for (const lesson of study.lessons) {
      const book = resolveBook(lesson.book)
      if (!book) continue
      const chapters = perBook.get(book.slug) ?? new Set<number>()
      chapters.add(lesson.chapter)
      perBook.set(book.slug, chapters)
    }
    for (const [slug, chapters] of perBook) {
      const list = map.get(slug) ?? []
      list.push({ study, chapters: [...chapters].sort((a, b) => a - b) })
      map.set(slug, list)
    }
  }

  // A whole-book study is the answer to "ik wil Daniël bestuderen"; a study
  // that merely passes through the book is not, so it sorts below.
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        Number(b.study.type === 'Boek') - Number(a.study.type === 'Boek') ||
        b.chapters.length - a.chapters.length,
    )
  }

  return map
})()

export function studiesForBook(slug: string): StudyOverlap[] {
  return STUDIES_BY_SLUG.get(slug) ?? []
}

export function hasStudyForBook(slug: string): boolean {
  return STUDIES_BY_SLUG.has(slug)
}

/**
 * The curated study that best fits a chapter range, or null when none of them
 * comes near it. `coverage` is what the caller decides on: a study covering six
 * of six selected chapters can replace reading, one covering eight of fifty is
 * a footnote.
 */
export function bestStudyForRange(
  slug: string,
  start: number,
  end: number,
): RangeMatch | null {
  const size = end - start + 1
  let best: RangeMatch | null = null

  for (const entry of studiesForBook(slug)) {
    const overlap = entry.chapters.filter(chapter => chapter >= start && chapter <= end).length
    // `<=` keeps the first of a tie, and the list is already sorted with the
    // whole-book study in front.
    if (overlap === 0 || overlap <= (best?.overlap ?? 0)) continue
    best = { ...entry, overlap, coverage: overlap / size }
  }

  return best
}

/**
 * An authored outline section ("5-7") as chapter numbers. Returns null when the
 * range is unparseable or reaches past the end of the book, so a typo in the
 * reference data cannot produce a selection that opens on nothing.
 */
export function parseOutlineRange(
  range: string,
  chapters: number,
): { start: number; end: number } | null {
  const parts = range.split(/[-–—]/).map(part => parseInt(part.trim(), 10))
  const start = parts[0]
  const end = parts.length > 1 ? parts[parts.length - 1] : start
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start < 1 || end < start || end > chapters) return null
  return { start, end }
}

/** "Daniël 1-6", or "Daniël 3" for a single chapter. */
export function passageLabel(book: BibleBook, start: number, end: number): string {
  return start === end ? `${book.name} ${start}` : `${book.name} ${start}-${end}`
}

export function chapterCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'hoofdstuk' : 'hoofdstukken'}`
}

/**
 * Which chapter a selection opens on. The reader takes one chapter at a time,
 * so a range opens at the first chapter of it the user has not read yet -
 * carrying on beats starting over. A finished range reopens at its start.
 */
export function openingChapter(selection: PassageSelection, read: number[] = []): number {
  const readSet = new Set(read)
  for (let chapter = selection.start; chapter <= selection.end; chapter++) {
    if (!readSet.has(chapter)) return chapter
  }
  return selection.start
}

export function passageHref(
  book: BibleBook,
  selection: PassageSelection,
  read: number[] = [],
): string {
  return readerHref(book, openingChapter(selection, read))
}

/** Chapters of the selection already marked read, for "2 van 6 gelezen". */
export function readWithinSelection(selection: PassageSelection, read: number[]): number {
  return read.filter(chapter => chapter >= selection.start && chapter <= selection.end).length
}

// ── The reader's own last selection ────────────────────────────────────────

/**
 * Kept in localStorage rather than on the server, on purpose.
 *
 * A self-picked passage is deliberately NOT turned into a `BiblePlan`. The
 * plan API can generate one (lib/planGenerator + POST /api/v1/plans), but
 * nothing on the web renders a plan document - the whole plan surface is the
 * mobile app - so creating one here would leave the reader with an invisible
 * record and, on a free account, a silent "je hebt al een actief leesplan"
 * rejection. What the passage IS worth is a way back into it, and the real
 * progress through it comes from `readChapters`, which the server already
 * keeps. So only the choice itself lives here.
 */
export const PASSAGE_KEY = 'bijbelstudie_passage_selection'

export function loadSavedPassage(): SavedPassage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PASSAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedPassage>
    const book = resolveBook(parsed?.slug)
    const start = Number(parsed?.start)
    const end = Number(parsed?.end)
    if (!book || !Number.isFinite(start) || !Number.isFinite(end)) return null
    if (start < 1 || end < start || end > book.chapters) return null
    return {
      slug: book.slug,
      start,
      end,
      savedAt: typeof parsed?.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveSelectedPassage(selection: PassageSelection): SavedPassage {
  const saved: SavedPassage = { ...selection, savedAt: new Date().toISOString() }
  try {
    window.localStorage.setItem(PASSAGE_KEY, JSON.stringify(saved))
  } catch {
    /* private mode, or the quota is full: the navigation still happens */
  }
  return saved
}
