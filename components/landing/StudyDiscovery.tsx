import Link from "next/link"

import { curatedStudies, type StudyType } from "../../lib/data/curated-studies"
import { ST, ST_SHELL, ST_EDGE, ST_HEADING } from "./studyLandingShared"

/**
 * The study block on the landing page: three studies to start with, server
 * rendered so anyone can see them. It used to open with a three-step "zo werkt
 * een studie" strip as well; the lesson demo above it now shows the loop
 * itself, so the steps went and the section is the studies.
 */

const KIND_LABEL: Record<StudyType, string> = {
  Boek: "Bijbelboek",
  Persoon: "Persoon",
  Gedeelte: "Gedeelte",
  Onderwerp: "Thema",
}

/** The hand-authored studies - the ones with real cover art and an intro a
 *  card can carry. Same rule the `/studies` featured carousel uses; three of
 *  them here, one row, so the section is a taste of the catalogue and not the
 *  catalogue. */
const FEATURED = curatedStudies
  .filter((study) => study.type !== "Boek" || (study.about?.length ?? 0) > 0)
  .slice(0, 3)


export function StudyDiscovery() {
  return (
    <>
      <section
        className="py-[clamp(3.5rem,6vw,6.5rem)]"
        style={{ backgroundColor: ST.light, ...ST_EDGE }}
      >
        <div className={ST_SHELL}>
          {/* Suggested studies */}
          <div className="reveal flex items-end justify-between gap-3">
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
