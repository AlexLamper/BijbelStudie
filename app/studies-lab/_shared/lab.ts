'use client'

import { useEffect, useMemo, useState } from 'react'
import { curatedStudies, type CuratedStudy } from '../../../lib/data/curated-studies'
import { BOOK_STUDY_ENTRIES, THEME_STUDIES } from '../../../lib/bookStudies'

/**
 * Gedeelde bouwstenen voor de studies-lab varianten G, H en I.
 *
 * Alle drie combineren dezelfde drie ingrediënten in een andere volgorde:
 *  - D: een traject (verder waar je was → één aanbevolen start → startsporen)
 *  - E: grote categoriekaarten die schermvullend openklappen
 *  - F: kiezen op tijd en doel, met een samenvatting in gewone taal
 *
 * De data-afleiding en de voortgangs-fetch zijn identiek, dus die staan hier
 * één keer in plaats van drie keer.
 */

export const TEAL = '#0D9488'
const COMPLETED_KEY = 'bijbelstudie_completed_studies'
const MINUTES_FALLBACK = 12

export type Intent = 'boek' | 'persoon' | 'thema' | 'vraag'
export type TimeKey = 'alles' | 'kort' | 'gemiddeld' | 'uitgebreid'
export type Category = 'ot' | 'nt' | 'personen' | 'themas'

export interface Entry {
  study: CuratedStudy
  /** Wat de lezer met deze studie wil doen. */
  intent: Intent
  /** De boekenkast-indeling: OT, NT, personen, thema's. */
  category: Category
  /** Eén woord voor wat voor soort studie dit is ("Wet", "Evangelie", "Persoon"). */
  kind: string
  lessonCount: number
  totalMinutes: number
  avgMinutes: number
  /** Alles waar een zoekopdracht op mag matchen, eenmalig lowercased. */
  haystack: string
}

function minutesOf(study: CuratedStudy): { total: number; avg: number } {
  const total = study.lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes ?? MINUTES_FALLBACK),
    0,
  )
  return { total, avg: Math.round(total / (study.lessons.length || 1)) }
}

export const ENTRIES: Entry[] = [
  ...BOOK_STUDY_ENTRIES.map(({ book, study }) => {
    const m = minutesOf(study)
    return {
      study,
      intent: 'boek' as const,
      category: (book.testament === 'oude-testament' ? 'ot' : 'nt') as Category,
      kind: book.genre,
      lessonCount: study.lessons.length,
      totalMinutes: m.total,
      avgMinutes: m.avg,
      haystack: `${study.title} ${book.name} ${book.genre} ${study.description}`.toLowerCase(),
    }
  }),
  ...THEME_STUDIES.map(study => {
    const m = minutesOf(study)
    const intent: Intent =
      study.type === 'Persoon' ? 'persoon' : study.type === 'Gedeelte' ? 'vraag' : 'thema'
    return {
      study,
      intent,
      category: (intent === 'persoon' ? 'personen' : 'themas') as Category,
      kind: intent === 'persoon' ? 'Persoon' : intent === 'vraag' ? 'Gedeelte' : 'Thema',
      lessonCount: study.lessons.length,
      totalMinutes: m.total,
      avgMinutes: m.avg,
      haystack: `${study.title} ${study.description}`.toLowerCase(),
    }
  }),
]

export const BY_CATEGORY = (category: Category) => ENTRIES.filter(e => e.category === category)

export const COUNTS: Record<Category, number> = {
  ot: BY_CATEGORY('ot').length,
  nt: BY_CATEGORY('nt').length,
  personen: BY_CATEGORY('personen').length,
  themas: BY_CATEGORY('themas').length,
}

export const CATEGORY_LABELS: Record<Category, string> = {
  ot: 'Oude Testament',
  nt: 'Nieuwe Testament',
  personen: 'Personen',
  themas: "Thema's",
}

export function inBucket(total: number, key: TimeKey): boolean {
  if (key === 'alles') return true
  if (key === 'kort') return total <= 80
  if (key === 'gemiddeld') return total > 80 && total <= 250
  return total > 250
}

export const TIME_CHIPS: { key: TimeKey; label: string }[] = [
  { key: 'kort', label: 'Een kwartier' },
  { key: 'gemiddeld', label: 'Een paar weken' },
  { key: 'uitgebreid', label: 'Een lange reis' },
  { key: 'alles', label: 'Maakt niet uit' },
]

export const INTENT_CHIPS: { key: Intent; label: string }[] = [
  { key: 'boek', label: 'Een bijbelboek begrijpen' },
  { key: 'persoon', label: 'Een persoon leren kennen' },
  { key: 'thema', label: 'Een thema volgen' },
  { key: 'vraag', label: 'Bij één vraag blijven' },
]

const TIME_ADJ: Record<TimeKey, string> = {
  alles: '',
  kort: 'korte ',
  gemiddeld: 'middellange ',
  uitgebreid: 'uitgebreide ',
}

const INTENT_PHRASE: Record<Intent, string> = {
  boek: ' waarin je een bijbelboek leert begrijpen',
  persoon: ' waarin je een persoon leert kennen',
  thema: ' waarin je een thema volgt',
  vraag: ' die bij één vraag of gedeelte blijft',
}

/** De zin in gewone taal onder de keuzes — het "flow"-idee uit versie F. */
export function summarize(rows: Entry[], time: TimeKey, intent: Intent | null): string {
  if (rows.length === 0) {
    return 'Geen studies die hierbij passen. Pas je keuze aan, of blader door de volledige lijst.'
  }
  const noun = rows.length === 1 ? 'studie' : 'studies'
  const avg = Math.round(rows.reduce((sum, entry) => sum + entry.avgMinutes, 0) / rows.length)
  return `${rows.length} ${TIME_ADJ[time]}${noun}${intent ? INTENT_PHRASE[intent] : ''} — ±${avg} minuten per les.`
}

/* ---- De aanbevolen start (versie D) ------------------------------------- */

const HERO_ENTRY =
  ENTRIES.find(e => e.study.id === 'boek-markus') ??
  ENTRIES.find(e => e.study.title.toLowerCase().includes('markus'))

export const HERO_STUDY: CuratedStudy = HERO_ENTRY?.study ?? curatedStudies[0]
export const HERO_WHY = HERO_ENTRY
  ? 'Het kortste evangelie: veel vaart, weinig omhaal, en meteen bij de kern — wie is Jezus, en wat vraagt hij van je?'
  : HERO_STUDY.description

/* ---- Startsporen (versie D) --------------------------------------------- */

export interface Track {
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
 * Elke matcher wordt eerst tegen de thema-studies gehouden (op id of titel) en
 * daarna tegen de bijbelboeken (op boeknaam). Een matcher die niets vindt wordt
 * overgeslagen; dubbele treffers vallen weg. Zo loopt een spoor nooit leeg door
 * één ontbrekend id.
 */
export const TRACKS: Track[] = TRACK_SEEDS.map(seed => {
  const seen = new Set<string>()
  const studies: CuratedStudy[] = []
  for (const raw of seed.matchers) {
    const m = raw.toLowerCase()
    const theme = THEME_STUDIES.find(s => s.id === m || s.title.toLowerCase().includes(m))
    const bookEntry = BOOK_STUDY_ENTRIES.find(e => e.book.name.toLowerCase().includes(m))
    const hit = theme ?? bookEntry?.study
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id)
      studies.push(hit)
    }
  }
  return { key: seed.key, label: seed.label, blurb: seed.blurb, studies }
}).filter(track => track.studies.length > 0)

/* ---- Voortgang ---------------------------------------------------------- */

interface Enrollment {
  studyId: string
  currentLessonDay: number
  lessonsCompleted: number
  lessonsTotal: number
  completedAt: string | null
}

export interface Status {
  completed: boolean
  done: number
  total: number
  resumeDay: number | null
  started: boolean
  pct: number
}

/**
 * Leest de voortgang: eerst localStorage zodat de badges meteen staan, daarna
 * de server — die het echte record is en van andere apparaten weet.
 */
export function useStudyProgress() {
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})

  useEffect(() => {
    try {
      setCompletedIds(JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]'))
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
        /* offline: de lokale lijst blijft staan */
      }
    })()

    void (async () => {
      try {
        const response = await fetch('/api/v1/study-enrollments')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const map: Record<string, Enrollment> = {}
        for (const entry of data.enrollments ?? []) map[entry.studyId] = entry
        setEnrollments(map)
      } catch {
        /* anonieme bezoekers zien simpelweg geen voortgang */
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

  const inProgress = useMemo(
    () =>
      ENTRIES.map(entry => ({ entry, status: statusFor(entry.study) })).filter(
        row => row.status.started && !row.status.completed,
      ),
    [statusFor],
  )

  const completed = useMemo(
    () =>
      ENTRIES.map(entry => ({ entry, status: statusFor(entry.study) })).filter(
        row => row.status.completed,
      ),
    [statusFor],
  )

  return { statusFor, inProgress, completed }
}
