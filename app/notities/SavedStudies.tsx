"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import StudyArtwork from "../studies/StudyArtwork"
import { Skeleton } from "../../components/kit/primitives"
import type { SavedStudyCard } from "../../lib/savedStudies"

/**
 * The "Bewaard" tab on /notities: the studies saved with the Bewaren button on
 * /studies/[id].
 *
 * One GET /api/v1/saved-studies?expand=1 resolves the ids server-side (studies
 * are static data, so no lookup per id). Removing uses the same POST the study
 * page uses - a `$pull` on `savedStudies` - optimistically, and puts the card
 * back where it was if the write fails.
 */
export default function SavedStudies() {
  const [studies, setStudies] = useState<SavedStudyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/v1/saved-studies?expand=1")
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || !Array.isArray(data.studies)) throw new Error("load failed")
      setStudies(data.studies)
      setError(null)
    } catch {
      setError("Bewaarde studies konden niet worden geladen.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function unsave(study: SavedStudyCard) {
    const index = studies.findIndex(s => s.id === study.id)
    if (index === -1) return
    setStudies(prev => prev.filter(s => s.id !== study.id))
    setError(null)
    try {
      const res = await fetch("/api/v1/saved-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyId: study.id, saved: false }),
      })
      if (!res.ok) throw new Error("unsave failed")
    } catch {
      setStudies(prev => {
        if (prev.some(s => s.id === study.id)) return prev
        const next = [...prev]
        next.splice(Math.min(index, next.length), 0, study)
        return next
      })
      setError(`"${study.title}" kon niet worden verwijderd uit je bewaarde studies.`)
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Bewaarde studies laden" className="grid grid-cols-1 gap-3 p-[22px] sm:grid-cols-2 xl:grid-cols-3 max-md:p-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-[150px] rounded-card" />)}
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {error && (
        <div role="alert" className="border-b border-line px-[22px] py-4 text-[13.5px] text-danger max-md:px-4">
          {error}
        </div>
      )}

      {studies.length === 0 ? (
        !error && (
          <div className="max-w-[34rem] px-[22px] py-10 max-md:px-4">
            <h3 className="text-[15.5px] font-bold text-ink">Nog geen bewaarde studies</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
              Tik op een studiepagina op Bewaren om een studie hier terug te vinden, ook als je er nog niet mee begonnen bent.
            </p>
            <Link
              href="/studies"
              className="mt-5 inline-flex items-center rounded-btn border border-line px-4 py-2.5 text-[13.5px] font-semibold text-ink-body no-underline transition-colors hover:bg-line-soft max-md:min-h-11"
            >
              Bekijk alle studies
            </Link>
          </div>
        )
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-[22px] sm:grid-cols-2 xl:grid-cols-3 max-md:p-4">
          {studies.map(study => {
            const lessons = `${study.lessonCount} ${study.lessonCount === 1 ? "les" : "lessen"}`
            return (
              <li key={study.id} className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-line-strong">
                <Link href={`/studies/${study.id}`} className="flex min-w-0 flex-1 flex-col no-underline">
                  <div className="relative h-[72px] flex-none overflow-hidden">
                    <StudyArtwork id={study.id} kind={study.type} ratio={3.4} quiet className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col px-[14px] pt-[11px]">
                    <div className="line-clamp-2 text-[14px] font-bold leading-[1.35] text-ink">{study.title}</div>
                    <div className="mt-[4px] truncate text-[12px] font-semibold text-[#0D9488] dark:text-teal-400">{study.passage}</div>
                    <div className="mt-[2px] truncate text-[11.5px] text-ink-faint">
                      {study.kind} · {lessons} · ±{study.avgMinutes} min
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-3 px-[14px] pb-3 pt-[10px]">
                  <Link
                    href={`/studies/${study.id}`}
                    tabIndex={-1}
                    aria-hidden
                    className="text-[13px] font-semibold text-[#0D9488] no-underline dark:text-teal-400"
                  >
                    Openen
                  </Link>
                  <button
                    type="button"
                    onClick={() => void unsave(study)}
                    aria-label={`${study.title} niet meer bewaren`}
                    className="rounded-[8px] px-2 py-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-line-soft hover:text-ink-body max-md:min-h-10"
                  >
                    Niet meer bewaren
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
