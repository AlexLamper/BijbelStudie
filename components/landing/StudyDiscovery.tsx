import Link from "next/link"
import { BookOpen, Compass, PenLine } from "lucide-react"

import { curatedStudies, type StudyType } from "../../lib/data/curated-studies"
import ContinueStudy from "./ContinueStudy"
import { ST, ST_SHELL, ST_CARD_SHADOW, ST_EDGE, ST_HEADING } from "./studyLandingShared"

/**
 * The study block on the landing page: the visitor-specific "Verder gaan" band
 * (a client island), then two server-rendered strips anyone can see - how a
 * study actually works, and a handful of studies to start with.
 *
 * The existing "Hoe het werkt" section further down is about signing up and
 * finding the reference tools; this strip is about the lesson loop itself, so a
 * first-time visitor understands what "een begeleide studie volgen" means
 * before they click through to `/studies`.
 */

const KIND_LABEL: Record<StudyType, string> = {
  Boek: "Bijbelboek",
  Persoon: "Persoon",
  Gedeelte: "Gedeelte",
  Onderwerp: "Thema",
}

/** The hand-authored studies - the ones with real cover art and an intro a
 *  card can carry. Same rule the `/studies` featured carousel uses. */
const FEATURED = curatedStudies
  .filter((study) => study.type !== "Boek" || (study.about?.length ?? 0) > 0)
  .slice(0, 6)

const STEPS = [
  {
    icon: Compass,
    title: "Kies een studie",
    desc: "Een bijbelboek, een persoon of een thema. Je stelt zelf je vertaling en je tempo in.",
  },
  {
    icon: BookOpen,
    title: "Volg de lessen",
    desc: "Per les lees je een kort gedeelte, met commentaren en de grondtekst binnen handbereik.",
  },
  {
    icon: PenLine,
    title: "Denk na en groei",
    desc: "Elke les sluit af met een vraag. Je voortgang en je notities worden bewaard.",
  },
]

export function StudyDiscovery() {
  return (
    <>
      <ContinueStudy />

      <section
        className="py-[clamp(3.5rem,6vw,6.5rem)]"
        style={{ backgroundColor: ST.card, ...ST_EDGE }}
      >
        <div className={ST_SHELL}>
          {/* How a study works */}
          <div className="reveal mx-auto max-w-2xl text-center">
            <p
              className="text-[0.6875rem] font-bold uppercase"
              style={{ color: ST.tealText, letterSpacing: "0.16em" }}
            >
              Zo werkt een studie
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
              Van eerste hoofdstuk tot afgeronde studie
            </h2>
          </div>

          <div className="reveal-stagger mt-[clamp(2rem,4vw,3rem)] grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, index) => (
              <div key={title} className="reveal">
                <div
                  className="flex h-full flex-col rounded-2xl border bg-white p-6"
                  style={{ borderColor: ST.border, boxShadow: ST_CARD_SHADOW }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: ST.tealLight,
                        backgroundImage: `linear-gradient(135deg, ${ST.tealLight}, rgba(13,148,136,0.05))`,
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: ST.teal }} />
                    </div>
                    <span
                      className="text-[0.6875rem] font-bold uppercase tabular-nums"
                      style={{ color: ST.muted, letterSpacing: "0.16em" }}
                    >
                      Stap {index + 1}
                    </span>
                  </div>
                  <h3
                    className="mt-4 text-base font-bold tracking-tight"
                    style={{ color: ST.text }}
                  >
                    {title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: ST.muted }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested studies */}
          <div className="reveal mt-[clamp(3rem,5vw,4.5rem)] flex items-end justify-between gap-3">
            <div>
              <p
                className="text-[0.6875rem] font-bold uppercase"
                style={{ color: ST.tealText, letterSpacing: "0.16em" }}
              >
                Om mee te beginnen
              </p>
              <h2
                className="mt-1 font-extrabold"
                style={{
                  color: ST.text,
                  fontSize: ST_HEADING,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Uitgelichte studies
              </h2>
            </div>
            <Link
              href="/studies"
              data-track="landing_studies_all"
              className="flex-none text-sm font-semibold underline underline-offset-2"
              style={{ color: ST.tealText }}
            >
              Alle studies
            </Link>
          </div>

          <div className="reveal-stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((study) => (
              <div key={study.id} className="reveal">
                <Link
                  href={`/studies/${study.id}`}
                  data-track="landing_study_card"
                  className="lp-card group flex h-full flex-col overflow-hidden rounded-2xl no-underline"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={study.image}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/6] w-full object-cover"
                    style={{ backgroundColor: ST.tealLight }}
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <p
                      className="text-[0.625rem] font-bold uppercase"
                      style={{ color: ST.tealText, letterSpacing: "0.14em" }}
                    >
                      {KIND_LABEL[study.type]}
                    </p>
                    <h3
                      className="mt-1.5 text-base font-bold tracking-tight"
                      style={{ color: ST.text }}
                    >
                      {study.title}
                    </h3>
                    <p
                      className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed"
                      style={{ color: ST.muted }}
                    >
                      {study.description}
                    </p>
                    <p
                      className="mt-3 text-xs font-semibold tabular-nums"
                      style={{ color: ST.muted }}
                    >
                      {study.lessons.length}{" "}
                      {study.lessons.length === 1 ? "les" : "lessen"}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default StudyDiscovery
