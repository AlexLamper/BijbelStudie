'use client'

import { useMemo, useState } from 'react'
import { BookOpen, GraduationCap } from 'lucide-react'
import {
  BIBLE_BOOKS,
  GENRE_ORDER,
  type BibleBook,
  type BookGenre,
  type Testament,
} from '../../lib/content/bibleBooks'
import ChapterPicker from './ChapterPicker'
import {
  chapterCountLabel,
  hasStudyForBook,
  resolveBook,
  type ChaptersReadBySlug,
  type PassageSelection,
} from './passageSelection'

const TEAL = '#0D9488'
/** #0D9488 is 3.7:1 on white - fine as a fill, short of AA as type. */
/**
 * #0D9488 is 3.7:1 on white and far too dark on the dark card, so teal that has
 * to be *read* uses the class pair rather than an inline brand colour. Fills and
 * icons stay on the inline TEAL - a solid block does not have to pass text
 * contrast, and it has to match the teal used everywhere else exactly.
 */
const TEAL_TYPE = 'text-teal-700 dark:text-teal-400'

const TESTAMENTS: { value: Testament; label: string; blurb: string }[] = [
  {
    value: 'oude-testament',
    label: 'Oude Testament',
    blurb: 'Van de schepping tot de terugkeer uit de ballingschap.',
  },
  {
    value: 'nieuwe-testament',
    label: 'Nieuwe Testament',
    blurb: 'Vier evangeliën, de eerste gemeenten, eenentwintig brieven en de Openbaring.',
  },
]

interface BookBrowserProps {
  /** Sanitised `readChapters`, keyed by book slug. */
  progress: ChaptersReadBySlug
  /** The page's search box. Empty means browse by testament. */
  query: string
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
  onStart: (selection: PassageSelection) => void
}

/**
 * Step one of the browser: which book.
 *
 * Sixty-six tiles at once is the thing this page has to avoid, so the list is
 * cut twice before it is drawn. The testament switch halves it to 39 or 27,
 * and inside that the books sit under their genre heading - Wet, Geschiedenis,
 * Grote profeten - which is the grouping /bijbelboeken already uses, so the two
 * pages read as one system. Nothing is collapsed behind a disclosure: a reader
 * who knows they want Habakuk should be able to see it without opening
 * anything.
 *
 * Searching cuts across both testaments, because someone typing "joh" wants
 * Johannes, not a reminder of which half of the Bible it is in.
 */
export default function BookBrowser({
  progress,
  query,
  selectedSlug,
  onSelect,
  onStart,
}: BookBrowserProps) {
  const [testament, setTestament] = useState<Testament>('oude-testament')

  const needle = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!needle) return null
    return BIBLE_BOOKS.filter(book =>
      `${book.name} ${book.slug} ${book.genre} ${book.theme}`.toLowerCase().includes(needle),
    )
  }, [needle])

  const selectedBook = selectedSlug ? resolveBook(selectedSlug) : undefined

  if (selectedBook) {
    return (
      <ChapterPicker
        // Remounts on a different book, which resets the chapter selection.
        key={selectedBook.slug}
        book={selectedBook}
        read={progress[selectedBook.slug] ?? []}
        onBack={() => onSelect(null)}
        onStart={onStart}
      />
    )
  }

  if (matches) {
    return (
      <div>
        <p className="text-xs text-gray-400 dark:text-muted-foreground tabular-nums mb-3">
          {matches.length} {matches.length === 1 ? 'boek' : 'boeken'} gevonden
        </p>
        {matches.length > 0 ? (
          <BookGrid books={matches} progress={progress} onSelect={onSelect} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={30} className="mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-muted-foreground text-sm">
              Geen bijbelboek gevonden voor &quot;{query}&quot;.
            </p>
          </div>
        )}
      </div>
    )
  }

  const active = TESTAMENTS.find(entry => entry.value === testament) ?? TESTAMENTS[0]
  const books = BIBLE_BOOKS.filter(book => book.testament === testament)
  const genres = GENRE_ORDER.filter(genre => books.some(book => book.genre === genre))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {TESTAMENTS.map(entry => {
          const count = BIBLE_BOOKS.filter(book => book.testament === entry.value).length
          const isActive = entry.value === testament
          return (
            <button
              key={entry.value}
              onClick={() => setTestament(entry.value)}
              data-track="study_testament"
              aria-pressed={isActive}
              className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-colors border ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
              }`}
              style={isActive ? { backgroundColor: TEAL } : undefined}
            >
              {entry.label}
              <span className="ml-1.5 text-xs opacity-60 tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-gray-400 dark:text-muted-foreground">{active.blurb}</p>

      {genres.map(genre => (
        <GenreGroup
          key={genre}
          genre={genre}
          books={books.filter(book => book.genre === genre)}
          progress={progress}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function GenreGroup({
  genre,
  books,
  progress,
  onSelect,
}: {
  genre: BookGenre
  books: BibleBook[]
  progress: ChaptersReadBySlug
  onSelect: (slug: string) => void
}) {
  return (
    <section className="mt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2.5 text-gray-400 dark:text-muted-foreground">
        {genre}
        <span className="ml-2 font-medium normal-case tracking-normal tabular-nums">
          {books.length}
        </span>
      </h3>
      <BookGrid books={books} progress={progress} onSelect={onSelect} />
    </section>
  )
}

function BookGrid({
  books,
  progress,
  onSelect,
}: {
  books: BibleBook[]
  progress: ChaptersReadBySlug
  onSelect: (slug: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2">
      {books.map(book => (
        <BookTile
          key={book.slug}
          book={book}
          read={progress[book.slug]?.length ?? 0}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

/**
 * One book.
 *
 * Three facts and nothing else: the name, how far in you are, and whether a
 * guided study already exists for it. The theme sentence lives on the book's
 * own panel one click away - sixty-six of them side by side is texture, not
 * information, and this page has been down that road before with the "Wat je
 * leert" lists on the study cards.
 */
function BookTile({
  book,
  read,
  onSelect,
}: {
  book: BibleBook
  read: number
  onSelect: (slug: string) => void
}) {
  const pct = Math.min(100, Math.round((read / book.chapters) * 100))
  const guided = hasStudyForBook(book.slug)

  return (
    <button
      onClick={() => onSelect(book.slug)}
      data-track="study_book_select"
      className="lift group text-left flex flex-col rounded-xl border bg-white dark:bg-card px-3 py-2.5 transition-colors border-gray-200 dark:border-border hover:border-teal-400 dark:hover:border-teal-700"
    >
      <span className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors truncate">
          {book.name}
        </span>
        {guided && (
          <GraduationCap
            size={13}
            className="flex-none mt-0.5"
            style={{ color: TEAL }}
            aria-label="Er is een begeleide studie voor dit boek"
          />
        )}
      </span>

      <span className="mt-0.5 text-[11px] tabular-nums text-gray-400 dark:text-muted-foreground">
        {read > 0 ? (
          <span className={`font-semibold ${TEAL_TYPE}`}>
            {read} van {book.chapters} gelezen
          </span>
        ) : (
          chapterCountLabel(book.chapters)
        )}
      </span>

      {/* Only drawn once there is something to draw, so an untouched testament
          is a clean grid rather than sixty-six empty rails. */}
      {read > 0 && (
        <span className="mt-1.5 block h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <span
            className="block h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: TEAL }}
          />
        </span>
      )}
    </button>
  )
}
