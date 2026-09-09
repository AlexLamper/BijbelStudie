import LandingTree from "../LandingTree"
import LevensboomGroeiDemo from "../LevensboomGroeiDemo"
import StudyFlowDemo from "../StudyFlowDemo"
import { CATALOG } from "../../../lib/levensboom/catalog"
import { STAGES } from "../../../lib/levensboom/stages"
import { renderTreeSvg } from "../../../lib/levensboom/svg"
import { LANDING_SEED, demoLesson } from "./content"
import { PLATE, SECTION_Y, SHELL, Scrim, SectionHead, TEAL_ON_DARK } from "./pieces"

/**
 * The two sections that show the product actually running.
 *
 * Both reuse the live landing page's demos unchanged - the lesson player and
 * the growth demo are the two most expensive things on the site to build and
 * the two most convincing things on it to watch. Neither is restyled: they are
 * drawn for a white page, and forking them to survive a dark panel would mean
 * two copies of a 740-line component drifting apart. Instead each is laid on
 * the scene as a lit object, which is also the honest reading - these are the
 * product, and the rest of the page is the argument for it.
 */

const MAX_LEVEL = 20

/* ── Zo werkt een les ─────────────────────────────────────────── */

export function LessonSection() {
  return (
    <section id="in-actie" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-les">
      <div className={SHELL}>
        <SectionHead
          id="proefland-les"
          label="Zo werkt een les"
          title="Vijf stappen, een kwartier per dag"
          subtitle="Elke les leidt je in dezelfde vijf stappen door één bijbelgedeelte: intro, het Woord, verdieping, reflectie en toetsing. Hieronder speelt de eerste les van De opstanding van Jezus vanzelf af - de echte les, geen schermafbeelding."
        />
        <div className={`p-4 sm:p-6 lg:p-8 ${PLATE}`}>
          <StudyFlowDemo lesson={demoLesson()} />
        </div>
      </div>
    </section>
  )
}

/* ── Jouw voortgang ───────────────────────────────────────────── */

/**
 * The five stages as one line of light across levels 1 to 20, each band as wide
 * as the number of levels it covers. It is the dashboard candidate's XP bar
 * turned into the one thing a visitor who has never signed in can be told about
 * progress: how far apart the milestones are.
 *
 * A real list with visible labels rather than a labelled graphic, so it needs
 * no ARIA to be read out in order.
 */
function StageLine() {
  return (
    <ol className="flex w-full items-end gap-1.5 sm:gap-2">
      {STAGES.map((stage, index) => {
        const next = STAGES[index + 1]
        const to = next ? next.from - 1 : MAX_LEVEL
        const span = Math.max(1, to - stage.from + 1)
        const last = !next
        const range = last
          ? `niveau ${stage.from}+`
          : stage.from === to
            ? `niveau ${stage.from}`
            : `niveau ${stage.from}–${to}`
        // The line brightens as it runs: the first band is a hint of the brand,
        // the last is the brand at full strength with light coming off it.
        const strength = 0.3 + (0.7 * index) / (STAGES.length - 1)
        return (
          <li key={stage.id} className="min-w-0" style={{ flexGrow: span, flexBasis: 0 }}>
            <span
              aria-hidden
              className="block h-1.5 rounded-full"
              style={{
                backgroundColor: last ? TEAL_ON_DARK : `rgba(45,212,191,${strength.toFixed(2)})`,
                boxShadow: last ? "0 0 18px rgba(45,212,191,0.8)" : "none",
              }}
            />
            <span className="mt-2.5 block truncate text-[11px] font-semibold text-white sm:text-xs">
              {stage.name}
            </span>
            <span className="block truncate text-[10px] tabular-nums text-white/65 sm:text-[11px]">
              {range}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function GrowthSection() {
  const levelItems = CATALOG.filter(item => item.unlock.kind === "level")

  return (
    <section id="voortgang" className={`relative z-10 scroll-mt-20 ${SECTION_Y}`} aria-labelledby="proefland-voortgang">
      <div className={SHELL}>
        <SectionHead
          id="proefland-voortgang"
          label="Jouw voortgang"
          title="Elk niveau een nieuwe boom"
          subtitle="Iedere lezer plant een boom. Hij begint als kiem en groeit met elke les, elk hoofdstuk en elke aantekening - op de website en in de app dezelfde boom. Schuif door de niveaus en zie hem groeien."
        />

        {/* The line of light sits on its own local scrim, like every other piece
            of copy that is not inside a panel. */}
        <div className="relative mb-8">
          <Scrim />
          <div className="relative">
            <StageLine />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start lg:gap-8">
          <div className={`p-4 sm:p-5 ${PLATE}`}>
            <LevensboomGroeiDemo
              seed={LANDING_SEED}
              initialSvg={renderTreeSvg({ seed: LANDING_SEED, level: 6, frac: 0.6, species: "eik", scene: "waterbeken", framing: "scene", width: 720, height: 450, rootAttributes: 'aria-hidden="true"' })}
            />
          </div>

          <ol className="space-y-2">
            {STAGES.map((stage, index) => {
              const next = STAGES[index + 1]
              const to = next ? next.from - 1 : null
              const range =
                to === null
                  ? `niveau ${stage.from}+`
                  : stage.from === to
                    ? `niveau ${stage.from}`
                    : `niveau ${stage.from}–${to}`
              const inBand = (at: number) => at >= stage.from && (to === null || at <= to)
              const brings = [
                ...(inBand(8) ? ["de eerste vrucht van de Geest"] : []),
                ...(inBand(16) ? ["een tweede stam"] : []),
                ...levelItems
                  .filter(item => inBand((item.unlock as { level: number }).level))
                  .map(item => item.name.toLowerCase()),
              ]
              const sample = to === null ? stage.from + 2 : Math.round((stage.from + to) / 2)
              return (
                <li
                  key={stage.id}
                  className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
                >
                  <LandingTree
                    svg={renderTreeSvg({ seed: LANDING_SEED, level: sample, frac: 0.6, species: "eik", framing: "portrait", width: 120, height: 120, rootAttributes: 'aria-hidden="true"' })}
                    seed={LANDING_SEED}
                    level={sample}
                    species="eik"
                    framing="portrait"
                    className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/20"
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">{stage.name}</h3>
                      <p className="flex-shrink-0 text-[11px] tabular-nums text-white/65">{range}</p>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/75">
                      {stage.blurb}
                      {brings.length > 0 ? ` Brengt ${brings.join(", ")}.` : ""}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
