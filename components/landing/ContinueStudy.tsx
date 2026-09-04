"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  ST,
  ST_SHELL,
  ST_CARD_SHADOW,
  ST_EDGE,
  ST_HEADING,
  STUDY_STEP_KEYS,
} from "./studyLandingShared"

/**
 * The one visitor-specific band on an otherwise static landing page.
 *
 * The page itself stays server-rendered: this island hydrates, asks
 * `/api/v1/study-enrollments` (the same route `/studies` uses) whether the
 * viewer has a study in progress, and either shows a "Verder gaan" panel that
 * links straight back into the current lesson, or - for a signed-out visitor,
 * or a signed-in one with nothing running - an invitation that explains the
 * study flow and points at `/studies`.
 *
 * The served HTML is the invitation. A signed-in visitor with an active study
 * is normally redirected to `/dashboard` by middleware before this page ever
 * renders, so the swap to the "Verder gaan" panel only happens in the edge
 * cases where they land here anyway (a stale session cookie, a direct hit) -
 * which means there is no flash of the wrong state for the common visitor.
 */

interface Enrollment {
  studyId: string
  status: string
  currentLessonDay: number
  currentStep: string
  lessonsTotal: number
  lessonsCompleted: number
  completedAt: string | null
}

interface CatalogStudy {
  id: string
  title: string
  image: string
}

function resumeHref(enrollment: Enrollment): string {
  const step =
    enrollment.currentStep && STUDY_STEP_KEYS.includes(enrollment.currentStep)
      ? `?stap=${enrollment.currentStep}`
      : ""
  return `/studie/${enrollment.studyId}/${enrollment.currentLessonDay}${step}`
}

/** Catalogue images come back absolutised; keep them root-relative so they load
 *  from whichever origin the visitor is on. */
function localImage(src: string): string {
  return src.replace(/^https?:\/\/[^/]+/, "")
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="py-[clamp(2.5rem,4vw,4rem)]"
      style={{ backgroundColor: ST.light, ...ST_EDGE }}
    >
      <div className={ST_SHELL}>{children}</div>
    </section>
  )
}

function ContinueCard({
  enrollment,
  study,
}: {
  enrollment: Enrollment
  study: CatalogStudy | null
}) {
  const total = enrollment.lessonsTotal
  const pct = total > 0 ? Math.round((enrollment.lessonsCompleted / total) * 100) : 0
  const title = study?.title ?? "Je bijbelstudie"

  return (
    <Shell>
      <div
        className="overflow-hidden rounded-2xl border bg-white md:flex"
        style={{ borderColor: ST.border, boxShadow: ST_CARD_SHADOW }}
      >
        <div className="relative flex-none md:w-64 lg:w-72">
          {study?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localImage(study.image)}
              alt=""
              loading="lazy"
              className="h-40 w-full object-cover md:h-full"
            />
          ) : (
            <div
              className="h-40 w-full md:h-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${ST.teal}, ${ST.tealDeep})`,
              }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3 p-6 lg:p-8">
          <p
            className="text-[0.6875rem] font-bold uppercase"
            style={{ color: ST.tealText, letterSpacing: "0.16em" }}
          >
            Verder gaan
          </p>
          <h2
            className="font-extrabold text-balance"
            style={{
              color: ST.text,
              fontSize: ST_HEADING,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          <p className="text-sm font-medium tabular-nums" style={{ color: ST.muted }}>
            Les {enrollment.currentLessonDay} van {total}
          </p>

          <div className="flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: ST.border }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Voortgang van deze studie"
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: ST.teal }}
              />
            </div>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: ST.tealText }}
            >
              {pct}%
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={resumeHref(enrollment)}
              data-track="landing_continue_study"
              className="press group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-semibold text-white transition-colors hover:bg-teal-800"
              style={{ backgroundColor: ST.tealDark }}
            >
              Verder met les {enrollment.currentLessonDay}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/studies"
              className="text-sm font-semibold underline underline-offset-2"
              style={{ color: ST.tealText }}
            >
              Alle studies bekijken
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function StudyInvite() {
  return (
    <Shell>
      <div
        className="overflow-hidden rounded-2xl border bg-white p-6 lg:p-10"
        style={{ borderColor: ST.border, boxShadow: ST_CARD_SHADOW }}
      >
        <div className="max-w-2xl">
          <p
            className="text-[0.6875rem] font-bold uppercase"
            style={{ color: ST.tealText, letterSpacing: "0.16em" }}
          >
            Begeleide studies
          </p>
          <h2
            className="mt-3 font-extrabold text-balance"
            style={{
              color: ST.text,
              fontSize: ST_HEADING,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Volg een studie, hoofdstuk voor hoofdstuk
          </h2>
          <p
            className="mt-4 text-pretty"
            style={{ color: ST.muted, fontSize: "1rem", lineHeight: 1.65 }}
          >
            Kies een bijbelboek, een persoon of een thema. Elke studie deelt de stof op in
            korte lessen: je leest het gedeelte, verdiept je met commentaren en de grondtekst,
            en denkt na over een vraag. Je voortgang wordt bewaard, dus je kunt altijd verder
            waar je gebleven was.
          </p>
          <div className="mt-7">
            <Link
              href="/studies"
              data-track="landing_studies_invite"
              className="press group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-semibold text-white transition-colors hover:bg-teal-800"
              style={{ backgroundColor: ST.tealDark }}
            >
              Ontdek alle studies
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default function ContinueStudy() {
  const [active, setActive] = useState<Enrollment | null>(null)
  const [study, setStudy] = useState<CatalogStudy | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch("/api/v1/study-enrollments")
        if (!response.ok || cancelled) return

        const data = await response.json()
        const list: Enrollment[] = data.enrollments ?? []
        // The list comes back most-recently-touched first.
        const current = list.find(
          (entry) =>
            !entry.completedAt && entry.status !== "completed" && entry.lessonsTotal > 0,
        )
        if (!current || cancelled) return
        setActive(current)

        // Only now - a signed-in reader with a live study - is the catalogue
        // worth fetching, for the cover and the title. It is cached hard.
        const catalogue = await fetch("/api/v1/studies/catalog")
        if (!catalogue.ok || cancelled) return
        const catalogueData = await catalogue.json()
        const match = (catalogueData.studies ?? []).find(
          (item: CatalogStudy) => item.id === current.studyId,
        )
        if (match && !cancelled) setStudy(match)
      } catch {
        /* offline or signed out: the invitation stands */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return active ? <ContinueCard enrollment={active} study={study} /> : <StudyInvite />
}
