'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, CheckCircle } from 'lucide-react'
import { curatedStudies, BADGE_STYLES, type StudyType, type CuratedStudy } from '../../lib/data/curated-studies'

const COMPLETED_KEY = 'bijbelstudie_completed_studies'

const FILTERS: { label: string; value: StudyType | 'Alle' }[] = [
  { label: 'Alle',      value: 'Alle'      },
  { label: 'Persoon',   value: 'Persoon'   },
  { label: 'Gedeelte',  value: 'Gedeelte'  },
  { label: 'Onderwerp', value: 'Onderwerp' },
  { label: 'Boek',      value: 'Boek'      },
]

function saveAndNavigate(study: CuratedStudy, lessonIndex: number, router: ReturnType<typeof useRouter>) {
  const lesson = study.lessons[lessonIndex]
  sessionStorage.setItem('activeStudy', JSON.stringify({
    studyId: study.id,
    studyTitle: study.title,
    lessons: study.lessons,
    currentLessonIndex: lessonIndex,
    completedLessons: [],
  }))
  router.push(
    `/studie?book=${encodeURIComponent(lesson.book)}&chapter=${lesson.chapter}&version=statenvertaling`
  )
}

function StudyCard({ study, completed }: { study: CuratedStudy; completed: boolean }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const badge = BADGE_STYLES[study.type]

  return (
    <div className={`bg-white dark:bg-card border rounded-xl overflow-hidden flex flex-col transition-colors ${
      completed ? 'border-teal-300 dark:border-teal-700' : 'border-gray-200 dark:border-border'
    }`}>
      {/* Image */}
      <div className="relative w-full" style={{ aspectRatio: '16/6' }}>
        <Image
          src={study.image}
          alt={study.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          style={{ backgroundColor: badge.bg, color: badge.color, backdropFilter: 'blur(4px)' }}
        >
          {study.type}
        </span>
        {completed && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-500 text-white">
            <CheckCircle size={9} /> Voltooid
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-bold text-sm text-gray-900 dark:text-foreground leading-snug mb-1 line-clamp-1">
          {study.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-2">
          {study.description}
        </p>

        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-muted-foreground">
            <Clock size={10} /> {study.durationLabel}
          </span>
          <button
            onClick={() => saveAndNavigate(study, 0, router)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0D9488' }}
          >
            Begin studie <ArrowRight size={10} />
          </button>
        </div>

        {/* Lessons toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full text-[11px] font-semibold py-2 mt-1 border-t border-gray-100 dark:border-border text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
        >
          <span>{study.lessons.length} lessen</span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Lesson list */}
        {open && (
          <div className="flex flex-col gap-0.5 pt-1 pb-1">
            {study.lessons.map((lesson, index) => (
              <button
                key={lesson.day}
                onClick={() => saveAndNavigate(study, index, router)}
                className="flex items-start gap-2 group rounded-md px-1.5 py-1.5 hover:bg-gray-50 dark:hover:bg-secondary transition-colors text-left w-full"
              >
                <span
                  className="flex-shrink-0 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: 'rgba(13,148,136,0.10)', color: '#0D9488' }}
                >
                  {lesson.day}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-gray-800 dark:text-foreground group-hover:text-teal-600 transition-colors leading-tight">
                      {lesson.title}
                    </span>
                    <span className="text-[9px] font-medium px-1 py-0 rounded"
                      style={{ backgroundColor: 'rgba(13,148,136,0.07)', color: '#0D9488' }}>
                      {lesson.book} {lesson.chapter}{lesson.verseRange ? `:${lesson.verseRange}` : ''}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                    {lesson.focus}
                  </p>
                </div>

                <ArrowRight size={10} className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#0D9488' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudiesPage() {
  const [filter, setFilter] = useState<StudyType | 'Alle'>('Alle')
  const [completedIds, setCompletedIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
      setCompletedIds(stored)
    } catch { /* noop */ }
  }, [])

  const filtered = filter === 'Alle'
    ? curatedStudies
    : curatedStudies.filter(s => s.type === filter)

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#0D9488' }}>
            Bijbelstudie
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-foreground mb-2">
            Studies
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground text-sm max-w-2xl">
            Elke studie leidt je stap voor stap door een thema, persoon of gedeelte uit de Bijbel. Je ziet per les precies welk hoofdstuk je leest en waarop je let.
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f.value
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-secondary text-gray-500 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-secondary/70'
              }`}
              style={filter === f.value ? { backgroundColor: '#0D9488' } : {}}
            >
              {f.label}
              {f.value !== 'Alle' && (
                <span className="ml-1.5 text-xs opacity-60">
                  {curatedStudies.filter(s => s.type === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(study => (
            <StudyCard key={study.id} study={study} completed={completedIds.includes(study.id)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={32} className="mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-muted-foreground">Geen studies gevonden voor dit filter.</p>
          </div>
        )}

      </div>
    </div>
  )
}
