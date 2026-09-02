'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Search } from 'lucide-react'
import { curatedStudies, type CuratedStudy } from '../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, CATALOGUE_ENTRIES, THEME_STUDIES } from '../../lib/bookStudies'
import { JsonLd } from '../../components/seo/JsonLd'
import { absoluteUrl } from '../../lib/seo/constants'
import {
  graph,
  webPageNode,
  itemListNode,
  courseNode,
} from '../../lib/seo/structuredData'

const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'

/** How many "verder waar je was" pills we show. Three is a strip; ten is a second catalogue. */
const RESUME_LIMIT = 3

/**
 * Only the hand-authored studies are described here.
 *
 * The sixty-six generated book studies are not thin duplicates of each other,
 * but they ARE near-duplicates of /bijbelboeken/[slug], which is the indexable
 * surface for a book's own content. Listing both would split the same subject
 * across two URLs and let Google pick; the study pages are marked non-indexable
 * instead, so they are deliberately absent from this graph and the sitemap.
 */
const STUDIES_GRAPH = (() => {
  const url = absoluteUrl('/studies')
  return graph(
    webPageNode({
      path: '/studies',
      name: 'Bijbelstudies',
      description:
        'Bijbelstudies over elk bijbelboek, plus studies over personen, thema\'s en gedeelten. Stap voor stap door de Schrift, gratis te volgen.',
      type: 'CollectionPage',
    }),
    itemListNode({
      pageUrl: url,
      name: 'Bijbelstudies',
      items: curatedStudies.map(study => ({
        name: study.title,
        path: `/studies/${study.id}`,
        description: study.description,
      })),
    }),
    ...curatedStudies.map(study =>
      courseNode({
        name: study.title,
        description: study.description,
        path: `/studies/${study.id}`,
        lessonCount: study.lessons.length,
        // Not the card banner: that is a 320x120 decorative SVG, well under the
        // size Google expects from a Course image. /og renders a real 1200x630
        // PNG carrying this study's title.
        image: `/og?${new URLSearchParams({ title: study.title, subtitle: study.description }).toString()}`,
        anchor: study.id,
      })
    )
  )
})()

/**
 * One question, answered top to bottom: waar begin je?
 *
 * The page used to be a catalogue - four filter buttons over sixty-six evenly
 * weighted cards - which answers "welke van de 77 wil ik", a question almost
 * nobody arrives with. What a reader actually needs is a first step. So the
 * main column is a route: carry on where you were, one recommended start, then
 * a handful of prepared tracks. The full shelf lives in the rail beside it,
 * one click away, for the reader who already knows the book they want.
 */

type Category = 'ot' | 'nt' | 'personen' | 'themas'

const CATEGORY_LABELS: Record<Category, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
}

/** The line under a category title: what you are looking at, and in what order. */
const CATEGORY_BLURBS: Record<Category, string> = {
  ot: 'Op volgorde van de canon, gegroepeerd per soort boek.',
  nt: 'Op volgorde van de canon, gegroepeerd per soort boek.',
  personen: 'Studies die één persoon door de tekst heen volgen.',
  themas: 'Studies die één lijn door meerdere bijbelboeken trekken.',
}

/** The categories that hold bible books, whose titles are short enough to pack tight. */
const BOOK_CATEGORIES: Category[] = ['ot', 'nt']

interface Enrollment {
  studyId: string
  currentLessonDay: number
  lessonsCompleted: number
  lessonsTotal: number
  completedAt: string | null
}

interface Status {
  completed: boolean
  done: number
  total: number
  resumeDay: number | null
  started: boolean
  pct: number
}

/** A catalogue row: the study, plus the words underneath it. */
interface Entry {
  study: CuratedStudy
  /** "Wet", "Evangelie", "Persoon" - what kind of thing this is, in one word. */
  kind: string
  category: Category
  lessonCount: number
  /** Average minutes per lesson; lessons without an estimate take the fallback. */
  avgMinutes: number
  /** Everything a search should match, lowercased once at module load. */
  haystack: string
}

// `kind`, `category`, `lessonCount` and `avgMinutes` come from lib/bookStudies
// so this page and /api/v1/studies/catalog group studies identically. Only the
// search haystack is built here - the API has no use for it.
const ENTRIES: Entry[] = CATALOGUE_ENTRIES.map(({ study, book, kind, category, lessonCount, avgMinutes }) => ({
  study,
  kind,
  category,
  lessonCount,
  avgMinutes,
  haystack: (book
    ? `${study.title} ${book.name} ${book.genre} ${study.description}`
    : `${study.title} ${study.description} ${study.lessons.map(lesson => lesson.book).join(' ')}`
  ).toLowerCase(),
}))

const ENTRY_BY_ID = new Map(ENTRIES.map(entry => [entry.study.id, entry]))

const byCategory = (category: Category) => ENTRIES.filter(entry => entry.category === category)

const COUNTS: Record<Category, number> = {
  ot: byCategory('ot').length,
  nt: byCategory('nt').length,
  personen: byCategory('personen').length,
  themas: byCategory('themas').length,
}

/**
 * The recommended start. Markus if it exists, otherwise the first study there
 * is - the page must never empty out because one id moved.
 */
const HERO_ENTRY =
  ENTRY_BY_ID.get('boek-markus') ??
  ENTRIES.find(entry => entry.study.title.toLowerCase().includes('markus'))
const HERO_STUDY: CuratedStudy = HERO_ENTRY?.study ?? curatedStudies[0]
const HERO_WHY = HERO_ENTRY
  ? 'Het kortste evangelie: veel vaart, weinig omhaal, en meteen bij de kern - wie is Jezus, en wat vraagt hij van je?'
  : HERO_STUDY.description

interface Track {
  key: string
  label: string
  blurb: string
  studies: CuratedStudy[]
}

const TRACK_SEEDS: { key: string; label: string; blurb: string; matchers: string[] }[] = [
  {
    key: 'beginners',
    label: 'Voor beginners',
    blurb: 'Korte, verhalende boeken om het ritme te pakken te krijgen.',
    matchers: ['markus', 'johannes', 'ruth', 'genesis', 'psalmen'],
  },
  {
    key: 'jezus',
    label: 'Het leven van Jezus',
    blurb: 'Van de evangelieverslagen naar de laatste week en de opstanding.',
    matchers: ['markus', 'johannes', 'bergrede', 'intocht', 'opstanding'],
  },
  {
    key: 'ot-verhalen',
    label: 'De grote verhalen van het OT',
    blurb: 'De mensen en gebeurtenissen waar de rest van de Bijbel op terugkijkt.',
    matchers: ['genesis', 'exodus', 'noach', 'abraham', 'mozes', 'david', 'daniël'],
  },
  {
    key: 'thema',
    label: 'Een thema volgen',
    blurb: 'Studies die één lijn door meerdere bijbelboeken heen trekken.',
    matchers: ['bergrede', 'psalmen', 'geloof-in-storm', 'opstanding', 'abraham'],
  },
]

/**
 * Every matcher is held against the themed studies first (on id or title) and
 * then against the bible books (on book name). A matcher that finds nothing is
 * skipped and duplicates fall away, so a track never empties out over one
 * missing id.
 */
const TRACKS: Track[] = TRACK_SEEDS.map(seed => {
  const seen = new Set<string>()
  const studies: CuratedStudy[] = []
  for (const raw of seed.matchers) {
    const needle = raw.toLowerCase()
    const theme = THEME_STUDIES.find(
      study => study.id === needle || study.title.toLowerCase().includes(needle),
    )
    const bookEntry = BOOK_STUDY_ENTRIES.find(entry =>
      entry.book.name.toLowerCase().includes(needle),
    )
    const hit = theme ?? bookEntry?.study
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      studies.push(hit)
    }
  }
  return { key: seed.key, label: seed.label, blurb: seed.blurb, studies }
}).filter(track => track.studies.length > 0)

/** The line under a track or category, in plain Dutch, so nobody has to count. */
function summarize(rows: Entry[]): string {
  if (rows.length === 0) return 'Hier staat nog niets.'
  const noun = rows.length === 1 ? 'studie' : 'studies'
  const avg = Math.round(rows.reduce((sum, entry) => sum + entry.avgMinutes, 0) / rows.length)
  return `${rows.length} ${noun} - ±${avg} minuten per les.`
}

/**
 * One study in a list.
 *
 * A card, not a poster: the name, one word for what kind of book it is, and the
 * lesson/time cost on a single muted line. Where you left off gets a bar, since
 * that is the only number worth reading twice.
 */
function StudyCard({ entry, status }: { entry: Entry; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-3.5 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-[15px] text-gray-900 dark:text-foreground leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {entry.study.title}
        </h3>
        {status.completed ? (
          <span
            className="mt-0.5 flex-none inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: TEAL }}
          >
            <CheckCircle2 size={14} /> Afgerond
          </span>
        ) : status.started ? (
          <span
            className="mt-0.5 flex-none text-xs font-semibold tabular-nums"
            style={{ color: TEAL }}
          >
            {status.pct}%
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
        <span className="font-semibold uppercase tracking-wider">{entry.kind}</span>
        <span aria-hidden>·</span>
        <span>
          {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
        </span>
        <span aria-hidden>·</span>
        <span>±{entry.avgMinutes} min per les</span>
      </div>

      {status.started && !status.completed && (
        <div className="mt-0.5">
          <div className="h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
            Les {status.resumeDay ?? status.done + 1} van {status.total}
          </p>
        </div>
      )}
    </Link>
  )
}

/**
 * One step of a track.
 *
 * A track is an order, not a shelf, so it reads as a numbered list: the step
 * number, the title, and the same cost line the cards carry. The number used to
 * be a teal disc floating over the corner of a card, which clipped the border
 * and left the reader to work out that the grid was a sequence at all.
 */
function TrackStep({ entry, step, status }: { entry: Entry; step: number; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
    >
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
        style={
          status.completed
            ? { backgroundColor: TEAL, color: '#ffffff' }
            : { backgroundColor: 'rgba(13,148,136,0.12)', color: TEAL }
        }
      >
        {status.completed ? <Check size={14} /> : step}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-[14.5px] font-semibold leading-snug text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {entry.study.title}
        </h3>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-400 dark:text-muted-foreground tabular-nums">
          <span className="font-semibold uppercase tracking-wider">{entry.kind}</span>
          <span aria-hidden>·</span>
          <span>
            {entry.lessonCount} {entry.lessonCount === 1 ? 'les' : 'lessen'}
          </span>
          <span aria-hidden>·</span>
          <span>±{entry.avgMinutes} min per les</span>
        </div>
        {status.started && !status.completed && (
          <div className="mt-1.5 h-1 max-w-[220px] overflow-hidden rounded-full bg-gray-100 dark:bg-secondary">
            <div
              className="h-full rounded-full"
              style={{ width: `${status.pct}%`, backgroundColor: TEAL }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-none items-center gap-2">
        {status.completed ? (
          <span className="text-[11px] font-semibold" style={{ color: TEAL }}>
            Afgerond
          </span>
        ) : status.started ? (
          <span
            className="hidden sm:block text-[11px] font-semibold tabular-nums"
            style={{ color: TEAL }}
          >
            les {status.resumeDay ?? status.done + 1}/{status.total}
          </span>
        ) : null}
        <ChevronRight
          size={15}
          className="text-gray-300 dark:text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  )
}

/**
 * One line in the browse grid: a title, and one number for what it costs you.
 *
 * Deliberately not a card. Browsing the Oude Testament is thirty-nine names you
 * scan for the one you already have in mind, and thirty-nine cards carrying a
 * genre, a lesson count and a minute estimate turned that into a page and a half
 * of scrolling. The lesson count stays because it is the one thing that differs
 * between Obadja and Jesaja; progress takes its place once you have any.
 */
function BookRow({ entry, status }: { entry: Entry; status: Status }) {
  return (
    <Link
      href={`/studies/${entry.study.id}`}
      data-track="study_card"
      className="group no-underline flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-secondary"
    >
      <span className="text-[13.5px] leading-snug text-gray-800 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
        {entry.study.title}
      </span>
      {status.completed ? (
        <span className="flex-none self-center" style={{ color: TEAL }}>
          <CheckCircle2 size={13} />
          <span className="sr-only">Afgerond</span>
        </span>
      ) : status.started ? (
        <span className="flex-none text-[11px] font-semibold tabular-nums" style={{ color: TEAL }}>
          {status.pct}%
        </span>
      ) : (
        <span className="flex-none text-[11px] tabular-nums text-gray-300 dark:text-muted-foreground">
          {entry.lessonCount}
          <span className="sr-only"> lessen</span>
        </span>
      )}
    </Link>
  )
}

/**
 * Rows bucketed on `kind`, in the order the kinds first appear.
 *
 * The canon already arrives grouped - five books of Wet, then Geschiedenis, and
 * so on - so first appearance is the right order and there is no second list of
 * genres to keep in sync. A category with one kind yields one group, which the
 * browse grid then renders without a caption.
 */
function groupByKind(rows: Entry[]): { kind: string; rows: Entry[] }[] {
  const buckets = new Map<string, Entry[]>()
  for (const entry of rows) {
    const bucket = buckets.get(entry.kind)
    if (bucket) bucket.push(entry)
    else buckets.set(entry.kind, [entry])
  }
  return [...buckets].map(([kind, entries]) => ({ kind, rows: entries }))
}

/** The card grid, still what a search returns: mixed results, no shared order. */
const CARD_GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3'

type View = { kind: 'track'; key: string } | { kind: 'category'; key: Category }

export default function StudiesPage() {
  const [view, setView] = useState<View | null>(null)
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  /** The API's order: most recently touched study first. */
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    // localStorage first so the badges paint immediately, then the server -
    // which is the real record and knows about other devices.
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
      setCompletedIds(stored)
    } catch {
      /* noop */
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-progress')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const fromServer: string[] = data.completedStudies ?? []
        setCompletedIds(current => [...new Set([...current, ...fromServer])])
      } catch {
        /* offline: the local list stands */
      }
    })()

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-enrollments')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const list: Enrollment[] = data.enrollments ?? []
        const map: Record<string, Enrollment> = {}
        for (const entry of list) map[entry.studyId] = entry
        setEnrollments(map)
        // The API already sorts on lastActivityAt; keeping that order is the
        // only thing that makes "the last three" actually the last three.
        setRecentIds(list.map(entry => entry.studyId))
      } catch {
        /* anonymous visitors simply see no progress */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const statusFor = useMemo(() => {
    return (study: CuratedStudy): Status => {
      const enrollment = enrollments[study.id]
      const done = enrollment?.lessonsCompleted ?? 0
      const total = study.lessons.length
      return {
        completed: completedIds.includes(study.id) || !!enrollment?.completedAt,
        done,
        total,
        resumeDay: enrollment?.currentLessonDay ?? null,
        started: done > 0 || enrollment?.currentLessonDay != null,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    }
  }, [enrollments, completedIds])

  /** Unfinished studies, most recently touched first, capped at RESUME_LIMIT. */
  const inProgress = useMemo(() => {
    const ordered = [
      ...recentIds.map(id => ENTRY_BY_ID.get(id)).filter((e): e is Entry => Boolean(e)),
      // Studies known only from localStorage have no enrollment row; they go last.
      ...ENTRIES.filter(entry => !recentIds.includes(entry.study.id)),
    ]
    return ordered
      .map(entry => ({ entry, status: statusFor(entry.study) }))
      .filter(row => row.status.started && !row.status.completed)
      .slice(0, RESUME_LIMIT)
  }, [statusFor, recentIds])

  /** A search cuts across everything: the reader typed a name, not a category. */
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return null
    return ENTRIES.filter(entry => entry.haystack.includes(needle))
  }, [query])

  const resumeStrip = inProgress.length > 0 && (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {inProgress.map(({ entry, status }) => (
        <Link
          key={entry.study.id}
          href={`/studies/${entry.study.id}`}
          data-track="study_resume_card"
          className="no-underline flex flex-none items-center gap-2 rounded-full border px-3 py-1.5 bg-white dark:bg-card transition-colors hover:border-teal-400"
          style={{ borderColor: 'rgba(13,148,136,0.30)' }}
        >
          <span className="text-[12px] font-semibold text-gray-900 dark:text-foreground">
            {entry.study.title}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-muted-foreground tabular-nums">
            les {status.resumeDay ?? status.done + 1}/{status.total} · {status.pct}%
          </span>
          <ArrowRight size={13} className="flex-none" style={{ color: TEAL }} />
        </Link>
      ))}
    </div>
  )

  const searchField = (
    <div className="relative w-full sm:w-72 flex-none">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Zoek een boek of thema"
        aria-label="Zoek een studie"
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
      />
    </div>
  )

  // ---- Detail: one track or one category fills the page. ------------------
  if (view !== null && searchResults === null) {
    const track = view.kind === 'track' ? TRACKS.find(item => item.key === view.key) : undefined
    const rows: Entry[] =
      view.kind === 'track'
        ? (track?.studies ?? [])
            .map(study => ENTRY_BY_ID.get(study.id))
            .filter((entry): entry is Entry => Boolean(entry))
        : byCategory(view.key)

    const title = view.kind === 'track' ? (track?.label ?? '') : CATEGORY_LABELS[view.key]
    const blurb = view.kind === 'track' ? track?.blurb : CATEGORY_BLURBS[view.key]
    /** Book titles are one or two words, so they pack into far more columns. */
    const dense = view.kind === 'category' && BOOK_CATEGORIES.includes(view.key)

    return (
      <div className="h-full overflow-y-auto">
        <JsonLd data={STUDIES_GRAPH} />

        <div className="px-5 sm:px-8 xl:px-10 py-6 w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setView(null)}
              className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-muted-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            >
              <ArrowLeft size={15} /> Terug
            </button>
            {searchField}
          </div>

          <h1 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
            {title}
          </h1>
          {blurb && (
            <p className="mt-1 text-[13px] text-gray-500 dark:text-muted-foreground">{blurb}</p>
          )}
          <p className="mt-2 text-[13px] text-gray-600 dark:text-muted-foreground">
            {summarize(rows)}
            {view.kind === 'category' && (
              <span className="text-gray-400 dark:text-muted-foreground">
                {' '}
                Het getal achter een titel is het aantal lessen.
              </span>
            )}
          </p>

          {view.kind === 'track' ? (
            /* One panel, one row per step. Capped at a readable measure: a track
               is five studies, and stretched over a 2xl screen the numbers and
               the titles end up half a metre apart. */
            <ol className="mt-5 max-w-[760px] list-none p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card divide-y divide-gray-100 dark:divide-border">
              {rows.map((entry, index) => (
                <li key={entry.study.id}>
                  <TrackStep entry={entry} step={index + 1} status={statusFor(entry.study)} />
                </li>
              ))}
            </ol>
          ) : (
            <section className="mt-5 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3 sm:p-4 space-y-4">
              {groupByKind(rows).map(group => (
                <div key={group.kind}>
                  {/* One group is the whole list - naming it says nothing. */}
                  {rows.length > group.rows.length && (
                    <h2 className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-muted-foreground">
                      {group.kind}
                      <span className="ml-1.5 font-medium tabular-nums text-gray-400 dark:text-muted-foreground">
                        {group.rows.length}
                      </span>
                    </h2>
                  )}
                  <ul
                    className={`list-none p-0 grid gap-x-2 ${
                      dense
                        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {group.rows.map(entry => (
                      <li key={entry.study.id}>
                        <BookRow entry={entry} status={statusFor(entry.study)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    )
  }

  // ---- Landing (or search results). --------------------------------------
  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="px-5 sm:px-8 xl:px-10 py-6 w-full">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground">
              Waar begin je?
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
              Van boven naar beneden. Eén keuze per keer, en elke studie leidt je hoofdstuk voor
              hoofdstuk door de tekst.
            </p>
          </div>
          {searchField}
        </header>

        {resumeStrip}

        {/* A search replaces the route: you already know what you are after. */}
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <p className="mt-8 text-sm text-gray-500 dark:text-muted-foreground">
              Niets gevonden voor &ldquo;{query.trim()}&rdquo;. Probeer de naam van een bijbelboek.
            </p>
          ) : (
            <section className="mt-6">
              <p className="text-[13px] text-gray-600 dark:text-muted-foreground">
                {summarize(searchResults)}
              </p>
              <div className={`mt-3 ${CARD_GRID}`}>
                {searchResults.map(entry => (
                  <StudyCard key={entry.study.id} entry={entry} status={statusFor(entry.study)} />
                ))}
              </div>
            </section>
          )
        ) : (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            {/* Main column: the decision. */}
            <div className="min-w-0">
              <div
                className="rounded-2xl border p-6 sm:p-8 bg-white dark:bg-card"
                style={{ borderColor: 'rgba(13,148,136,0.35)' }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: TEAL }}
                >
                  Aanbevolen om mee te beginnen
                </p>
                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-gray-900 dark:text-foreground">
                  {HERO_STUDY.title}
                </h2>
                <p className="mt-2 max-w-[70ch] text-sm sm:text-[14.5px] leading-relaxed text-gray-600 dark:text-muted-foreground">
                  {HERO_WHY}
                </p>
                <p className="mt-2 text-[11.5px] text-gray-400 dark:text-muted-foreground tabular-nums">
                  {HERO_STUDY.lessons.length} {HERO_STUDY.lessons.length === 1 ? 'les' : 'lessen'} ·
                  één hoofdstuk per keer
                </p>
                <Link
                  href={`/studies/${HERO_STUDY.id}`}
                  data-track="study_hero_start"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  Begin
                  <ArrowRight size={16} />
                </Link>
              </div>

              {TRACKS.length > 0 && (
                <section className="mt-7">
                  <h2 className="text-[13px] font-bold text-foreground mb-2.5">
                    Of kies een startspoor
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                    {TRACKS.map(track => (
                      <button
                        key={track.key}
                        onClick={() => setView({ kind: 'track', key: track.key })}
                        data-track={`study_track_${track.key}`}
                        className="group text-left flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5 min-h-[150px] transition-colors hover:border-teal-400 dark:hover:border-teal-700"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-base font-bold text-gray-900 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                            {track.label}
                          </span>
                          <span
                            className="flex-none text-xl font-bold tabular-nums"
                            style={{ color: TEAL }}
                          >
                            {track.studies.length}
                          </span>
                        </span>
                        <span className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed">
                          {track.blurb}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Rail: the shelf, for the reader who already knows the book. */}
            <aside className="min-w-0">
              <section className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-4">
                <h2 className="text-[13px] font-bold text-foreground">Of blader zelf</h2>
                <ul className="mt-2 divide-y divide-gray-100 dark:divide-border list-none p-0">
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map(key => (
                    <li key={key}>
                      <button
                        onClick={() => setView({ kind: 'category', key })}
                        data-track={`study_filter_${key}`}
                        className="group w-full flex items-center justify-between gap-2 py-2.5 text-left"
                      >
                        <span className="text-[13.5px] text-gray-800 dark:text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                          {CATEGORY_LABELS[key]}
                        </span>
                        <span
                          className="flex-none text-[12px] font-semibold tabular-nums"
                          style={{ color: TEAL }}
                        >
                          {COUNTS[key]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
