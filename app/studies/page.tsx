'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ListChecks,
  Play,
  Search,
  Users,
} from 'lucide-react'
import { curatedStudies, type StudyType, type CuratedStudy } from '../../lib/data/curated-studies'
import { estimateStudyMinutes } from '../../lib/studyFlow'
import { BIBLE_BOOKS } from '../../lib/content/bibleBooks'
import BookBrowser from '../../components/study/BookBrowser'
import {
  loadSavedPassage,
  passageHref,
  passageLabel,
  readWithinSelection,
  resolveBook,
  sanitizeReadChapters,
  saveSelectedPassage,
  type ChaptersReadBySlug,
  type PassageSelection,
  type SavedPassage,
} from '../../components/study/passageSelection'
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

/**
 * Each curated study is a Course, opened from its own detail page. The `anchor`
 * keeps the @id values distinct; duplicates would collapse into one node.
 *
 * The book browser adds no nodes here. Its destinations are /studies/:id, which
 * is already in this graph, and /lezen, which is not a page search engines
 * should be sent a list of - the sixty-six public book pages under
 * /bijbelboeken are the indexable surface for that.
 */
const STUDIES_GRAPH = (() => {
  const url = absoluteUrl('/studies')
  return graph(
    webPageNode({
      path: '/studies',
      name: 'Begeleide bijbelstudies',
      description:
        'Begeleide bijbelstudies over bijbelboeken, personen, thema\'s en gedeelten. Stap voor stap door de Schrift, gratis te volgen.',
      type: 'CollectionPage',
    }),
    itemListNode({
      pageUrl: url,
      name: 'Begeleide bijbelstudies',
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
 * The catalogue's own words for each category.
 *
 * "Boek", "Persoon" and the rest are the data's labels, not a reader's question.
 * Someone arriving here is thinking "ik wil Daniël bestuderen", so each filter
 * says what you would actually get.
 */
const FILTERS: { label: string; value: StudyType | 'Alle'; hint: string }[] = [
  { label: 'Alles',       value: 'Alle',      hint: 'Alle studies bij elkaar' },
  { label: 'Bijbelboek',  value: 'Boek',      hint: 'Een heel bijbelboek, hoofdstuk voor hoofdstuk' },
  { label: 'Persoon',     value: 'Persoon',   hint: 'Het leven van een bijbelse figuur' },
  { label: 'Gedeelte',    value: 'Gedeelte',  hint: 'Eén gebeurtenis of gedeelte uitgediept' },
  { label: 'Onderwerp',   value: 'Onderwerp', hint: 'Een thema dwars door de Schrift heen' },
]

const TYPE_LABEL: Record<StudyType, string> = {
  Boek: 'Bijbelboek',
  Persoon: 'Persoon',
  Gedeelte: 'Gedeelte',
  Onderwerp: 'Onderwerp',
}

/**
 * The two ways into the page.
 *
 * A switch rather than two stacked sections. The curated catalogue and the
 * canon are answers to the same question - "wat ga ik bestuderen?" - and
 * showing both at once puts eleven cards and sixty-six tiles on one screen,
 * which is exactly the wall this page is meant not to be. One is always fully
 * visible, the other is one click away and counted on its own button.
 */
type Mode = 'studies' | 'boeken'

const MODES: { value: Mode; label: string; count: number; hint: string }[] = [
  {
    value: 'studies',
    label: 'Begeleide studies',
    count: curatedStudies.length,
    hint: 'Uitgewerkte studies in korte lessen: lezen, verdiepen, reflecteren en toetsen.',
  },
  {
    value: 'boeken',
    label: 'Bijbelboeken',
    count: BIBLE_BOOKS.length,
    hint: 'Kies zelf: een heel boek, een reeks hoofdstukken of één hoofdstuk.',
  },
]

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
}

/** Which books a study walks through, for the line under the title. */
function scopeLine(study: CuratedStudy): string {
  const books = [...new Set(study.lessons.map(lesson => lesson.book))]
  if (books.length === 1) return books[0]
  if (books.length === 2) return `${books[0]} en ${books[1]}`
  return `${books[0]}, ${books[1]} en ${books.length - 2} meer`
}

/**
 * One study in the catalogue.
 *
 * No cover image, and no "Wat je leert" list either.
 *
 * The banners were decorative SVGs that carried no information. The learning
 * list was the opposite problem - four bulleted lesson titles inside a tinted
 * box inside the card, on every one of eleven cards at once. It was real
 * information, but a grid of forty-four bullets is not something anyone reads;
 * it is texture, and it buried the four facts a choice is actually made on. Those
 * lessons are one click away on the study's own page, listed in full.
 *
 * What is left is what someone chooses on: what kind of study it is, what it is
 * called, what it is about, which books it walks through, and how long it takes.
 */
function StudyCard({ study, status }: { study: CuratedStudy; status: Status }) {
  const minutes = estimateStudyMinutes(study)
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0
  const started = status.done > 0 || status.resumeDay != null

  return (
    <Link
      href={`/studies/${study.id}`}
      data-track="study_card"
      className="lift group no-underline flex flex-col rounded-2xl border bg-white dark:bg-card p-4 transition-colors border-gray-200 dark:border-border hover:border-teal-400 dark:hover:border-teal-700"
    >
      {/* Type and state. The one row that is the same on every card, so the
          eye can compare them without reading. */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: 'rgba(13,148,136,0.10)', color: '#0F766E' }}
        >
          {TYPE_LABEL[study.type]}
        </span>
        {status.completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
            <CheckCircle2 size={12} /> Voltooid
          </span>
        ) : started ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
            <Play size={10} /> Bezig
          </span>
        ) : null}
      </div>

      <h3 className="font-bold text-base text-gray-900 dark:text-foreground leading-snug mb-1.5 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
        {study.title}
      </h3>
      <p className="text-[13px] text-gray-500 dark:text-muted-foreground leading-relaxed line-clamp-2">
        {study.description}
      </p>

      {/* Everything below is pinned to the bottom so the CTA lines up across
          the grid however tall the text above turned out. */}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-gray-400 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1 min-w-0">
            <BookOpen size={12} className="flex-none" />
            <span className="truncate">{scopeLine(study)}</span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <ListChecks size={12} /> {study.lessons.length} lessen
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> ± {minutes} min
          </span>
        </div>

        {started && !status.completed && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-foreground">
                Les {status.resumeDay ?? status.done + 1} van {status.total}
              </span>
              <span className="text-gray-400 dark:text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>
        )}

        {/* teal-600 is #0D9488 exactly, so the hover fill matches the brand
            colour used inline everywhere else without an arbitrary value. */}
        <span className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold border border-teal-600 text-teal-700 dark:text-teal-400 transition-colors group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600">
          {status.completed ? 'Opnieuw bekijken' : started ? 'Verder gaan' : 'Bekijk studie'}
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}

/** The shell shared by both kinds of resume card, so the strip stays one row type. */
function ResumeCard({
  href,
  title,
  detail,
  pct,
  track,
}: {
  href: string
  title: string
  detail: string
  pct: number
  track: string
}) {
  return (
    <Link
      href={href}
      data-track={track}
      className="no-underline group flex items-center gap-3 rounded-xl border p-3 bg-white dark:bg-card transition-colors hover:border-teal-300 dark:hover:border-teal-700"
      style={{ borderColor: 'rgba(13,148,136,0.30)' }}
    >
      <span
        className="h-10 w-10 flex-none rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'rgba(13,148,136,0.10)' }}
      >
        <Play size={15} style={{ color: TEAL }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
        <span className="block text-[11px] text-gray-500 dark:text-muted-foreground">{detail}</span>
        <span className="mt-1.5 block h-1 rounded-full bg-gray-100 dark:bg-secondary overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEAL }} />
        </span>
      </span>
      <ArrowRight size={15} className="flex-none opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }} />
    </Link>
  )
}

export default function StudiesPage() {
  const [mode, setMode] = useState<Mode>('studies')
  const [filter, setFilter] = useState<StudyType | 'Alle'>('Alle')
  const [query, setQuery] = useState('')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  const [readChapters, setReadChapters] = useState<ChaptersReadBySlug>({})
  const [savedPassage, setSavedPassage] = useState<SavedPassage | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  useEffect(() => {
    // localStorage first so the badges paint immediately, then the server -
    // which is the real record and knows about other devices.
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
      setCompletedIds(stored)
    } catch { /* noop */ }

    setSavedPassage(loadSavedPassage())

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-progress')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const fromServer: string[] = data.completedStudies ?? []
        setCompletedIds(current => [...new Set([...current, ...fromServer])])
      } catch { /* offline: the local list stands */ }
    })()

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-enrollments')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const map: Record<string, Enrollment> = {}
        for (const entry of data.enrollments ?? []) map[entry.studyId] = entry
        setEnrollments(map)
      } catch { /* anonymous visitors simply see no progress */ }
    })()

    void (async () => {
      try {
        // 401 for a signed-out visitor, which is not an error here - the book
        // grid simply shows no progress. sanitizeReadChapters is what stands
        // between the corrupted keys this map has carried and the UI.
        const response = await fetch('/api/user/reading-progress')
        if (!response.ok || cancelled) return
        const data = await response.json()
        setReadChapters(sanitizeReadChapters(data?.readChapters))
      } catch { /* offline, or signed out */ }
    })()

    return () => { cancelled = true }
  }, [])

  const statusFor = useMemo(() => {
    return (study: CuratedStudy): Status => {
      const enrollment = enrollments[study.id]
      return {
        completed: completedIds.includes(study.id) || !!enrollment?.completedAt,
        done: enrollment?.lessonsCompleted ?? 0,
        total: study.lessons.length,
        resumeDay: enrollment?.currentLessonDay ?? null,
      }
    }
  }, [enrollments, completedIds])

  const inProgress = useMemo(
    () =>
      curatedStudies.filter(study => {
        const status = statusFor(study)
        return !status.completed && (status.done > 0 || status.resumeDay != null)
      }),
    [statusFor],
  )

  /**
   * The reader's own last selection, as a resume card.
   *
   * There is no plan document behind it - see the note in passageSelection -
   * so the progress shown is the real thing: which chapters of the range the
   * server has actually recorded as read. Once the range is finished the card
   * disappears, because "verder waar je was" is then a lie.
   */
  const passageResume = useMemo(() => {
    if (!savedPassage) return null
    const book = resolveBook(savedPassage.slug)
    if (!book) return null
    const selection: PassageSelection = savedPassage
    const read = readChapters[book.slug] ?? []
    const total = savedPassage.end - savedPassage.start + 1
    const done = readWithinSelection(selection, read)
    if (done >= total) return null
    return {
      href: passageHref(book, selection, read),
      title: passageLabel(book, savedPassage.start, savedPassage.end),
      detail: `${done} van ${total} ${total === 1 ? 'hoofdstuk' : 'hoofdstukken'} gelezen`,
      pct: Math.round((done / total) * 100),
    }
  }, [savedPassage, readChapters])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    // Book studies first. They are the longest commitment and the thing people
    // arrive looking for ("ik wil Daniël bestuderen"); buried at the end of the
    // grid they read as an afterthought.
    const ordered = [...curatedStudies].sort(
      (a, b) => Number(b.type === 'Boek') - Number(a.type === 'Boek'),
    )
    return ordered.filter(study => {
      if (filter !== 'Alle' && study.type !== filter) return false
      if (!needle) return true
      const haystack = [
        study.title,
        study.description,
        ...study.lessons.map(lesson => `${lesson.title} ${lesson.book}`),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [filter, query])

  const activeMode = MODES.find(entry => entry.value === mode) ?? MODES[0]

  /** Remember the passage as the reader leaves for it, so the strip can offer it back. */
  function handlePassageStart(selection: PassageSelection) {
    setSavedPassage(saveSelectedPassage(selection))
  }

  return (
    <div className="h-full overflow-y-auto">
      <JsonLd data={STUDIES_GRAPH} />

      <div className="px-5 sm:px-8 xl:px-10 py-8 max-w-[1400px] mx-auto">

        {/* Hero. The h1 carries the phrase people search for; the search box
            lives inside it because "how do I find a study" is the first
            question someone has on this page. */}
        <header className="rounded-2xl border border-teal-200/60 dark:border-teal-900/40 bg-gradient-to-br from-teal-50/80 via-white to-white dark:from-teal-950/25 dark:via-card dark:to-card p-6 sm:p-8">
          {/* No decorative icon. A sparkle next to the product name is ornament
              on a page whose job is to be trusted with someone's bible study. */}
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: TEAL }}>
            Bijbelstudie
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Begeleide bijbelstudies
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground text-sm sm:text-[15px] max-w-2xl leading-relaxed">
            Volg een uitgewerkte studie die je stap voor stap door de tekst leidt - lezen,
            verdiepen, reflecteren en toetsen. Of kies zelf een bijbelboek, een reeks
            hoofdstukken of één hoofdstuk.
          </p>

          <div className="relative mt-5 max-w-xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                // Typing is a request to look around again, so it steps back
                // out of an opened book rather than filtering nothing.
                if (event.target.value) setSelectedSlug(null)
              }}
              placeholder={
                mode === 'boeken'
                  ? 'Zoek een bijbelboek'
                  : 'Zoek op boek, persoon, gedeelte of thema'
              }
              aria-label={mode === 'boeken' ? 'Zoek een bijbelboek' : 'Zoek een studie'}
              className="w-full h-12 pl-11 pr-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-background text-sm text-foreground placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: 'rgba(13,148,136,0.35)' }}
            />
          </div>
        </header>

        {/* Resume strip, directly under the search box: a returning reader is
            here to carry on, not to browse. Only rendered when there is
            something to resume, so it never occupies space with an empty
            state. A self-picked passage sits in the same strip as an enrolled
            study - from the reader's side both are "waar was ik". */}
        {(inProgress.length > 0 || passageResume) && (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-foreground mb-2.5">Verder waar je was</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {passageResume && (
                <ResumeCard
                  href={passageResume.href}
                  title={passageResume.title}
                  detail={passageResume.detail}
                  pct={passageResume.pct}
                  track="study_passage_resume"
                />
              )}
              {inProgress.map(study => {
                const status = statusFor(study)
                const pct = Math.round((status.done / status.total) * 100)
                return (
                  <ResumeCard
                    key={study.id}
                    href={`/studies/${study.id}`}
                    title={study.title}
                    detail={`Les ${status.resumeDay ?? status.done + 1} van ${status.total} · ${pct}% klaar`}
                    pct={pct}
                    track="study_resume_card"
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* What am I browsing: the catalogue, or the canon. */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            {MODES.map(entry => {
              const active = entry.value === mode
              return (
                <button
                  key={entry.value}
                  onClick={() => setMode(entry.value)}
                  data-track={entry.value === 'boeken' ? 'study_mode_books' : 'study_mode_studies'}
                  aria-pressed={active}
                  className={`h-10 px-4 rounded-lg text-[13.5px] font-semibold transition-colors border ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                  }`}
                  style={active ? { backgroundColor: TEAL } : undefined}
                >
                  {entry.label}
                  <span className="ml-1.5 text-xs opacity-60 tabular-nums">{entry.count}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-muted-foreground">
            {activeMode.hint}
          </p>
        </section>

        {mode === 'studies' ? (
          <>
            {/* Filter toolbar. The category buttons carry a one-line explanation
                of what that kind of study is, shown as a title on hover. */}
            <section className="mt-5">
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map(entry => {
                  const active = filter === entry.value
                  const count =
                    entry.value === 'Alle'
                      ? curatedStudies.length
                      : curatedStudies.filter(study => study.type === entry.value).length
                  return (
                    <button
                      key={entry.value}
                      onClick={() => setFilter(entry.value)}
                      title={entry.hint}
                      aria-pressed={active}
                      className={`h-9 px-3.5 rounded-lg text-[13px] font-medium transition-colors border ${
                        active
                          ? 'text-white border-transparent'
                          : 'bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary'
                      }`}
                      style={active ? { backgroundColor: TEAL } : undefined}
                    >
                      {entry.label}
                      <span className="ml-1.5 text-xs opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* The per-filter explanation that used to sit here is gone. The
                  buttons are one word each and the cards below say the rest; a
                  caption explaining a caption is the definition of too much. */}
              <p className="mt-2 text-xs text-gray-400 dark:text-muted-foreground tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'studie' : 'studies'}
              </p>
            </section>

            {/* Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map(study => (
                <StudyCard key={study.id} study={study} status={statusFor(study)} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="content-in flex flex-col items-center justify-center py-20 text-center">
                <BookOpen size={32} className="mb-3 text-gray-300" />
                <p className="text-gray-500 dark:text-muted-foreground">
                  Geen studie gevonden{query ? ` voor "${query}"` : ''}.
                </p>
                {(query || filter !== 'Alle') && (
                  <button
                    onClick={() => { setQuery(''); setFilter('Alle') }}
                    className="mt-3 text-sm font-semibold"
                    style={{ color: TEAL }}
                  >
                    Alles tonen
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-5">
            <BookBrowser
              progress={readChapters}
              query={query}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
              onStart={handlePassageStart}
            />
          </div>
        )}

        {/* Studying together, at the bottom and on one line.

            It was a full card between the hero and the studies, so the first
            thing on a page about choosing a study was an advert for a different
            feature. It is a side road, and it now reads like one. The
            "1 - Kies een studie / 2 - Volg korte lessen / 3 - Houd je voortgang
            bij" explainer that sat beside it is gone entirely: it described the
            page the reader was already looking at. */}
        <Link
          href="/groepen"
          data-track="sidebar_groepen"
          className="no-underline mt-8 flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-3 transition-colors hover:border-teal-300 dark:hover:border-teal-700"
        >
          <Users size={15} className="flex-none" style={{ color: TEAL }} />
          <span className="text-[13px] text-foreground">
            <span className="font-semibold">Samen studeren?</span>
            <span className="text-gray-500 dark:text-muted-foreground">
              {' '}
              Lees hetzelfde gedeelte met een studiegroep.
            </span>
          </span>
          <ArrowRight size={14} className="flex-none ml-auto opacity-40" style={{ color: TEAL }} />
        </Link>
      </div>
    </div>
  )
}
