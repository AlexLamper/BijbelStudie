import Link from "next/link"
import { ArrowRight } from "lucide-react"
import CountUp from "../CountUp"
import { HERO_STATS } from "./content"
import {
  CTA_PRIMARY,
  CTA_QUIET,
  EDGE_X,
  EYEBROW,
  GlassStat,
  HERO_GATE_ID,
  TEAL_ON_DARK,
  TYPE,
} from "./pieces"

/**
 * Layer one, the sky: the whole first screen is landscape, with the promise,
 * the proof and the one action set straight into it.
 *
 * A server component with no client boundary of its own. The headline, the
 * subheading and the primary call to action are therefore in the served HTML
 * and readable before a single byte of JavaScript executes - which is the
 * point: `/` is the site's main SEO surface and its measured FCP is already
 * 2.86s. Nothing here waits on hydration, and nothing here is inside a
 * scroll-reveal.
 *
 * Full-bleed on purpose. There is no centred container above the fold: the
 * copy is capped at a reading measure and anchored to the left scrim, and the
 * picture runs to all four edges around it.
 *
 * The section is also the gate for the live canvas - see SceneBackdrop.
 */
export default function HeroStage() {
  return (
    <>
      <section
        id={HERO_GATE_ID}
        aria-labelledby="proefland-titel"
        className={`relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col justify-center pb-40 pt-12 sm:pb-44 ${EDGE_X}`}
      >
        <div className="pl-sky max-w-[46rem]">
          <p className={EYEBROW}>Online bijbelstudie in het Nederlands</p>

          {/* The one h1 on the page, carrying the head term verbatim. */}
          <h1
            id="proefland-titel"
            className="mt-4 font-semibold text-balance text-white"
            style={{ fontSize: TYPE.h1, lineHeight: 1.04, letterSpacing: "-0.03em" }}
          >
            De Nederlandse tool voor online{" "}
            <span style={{ color: TEAL_ON_DARK }}>bijbelstudie</span>
          </h1>

          {/* The claim leads, the evidence follows in the same sentence. "#1" is
              a ranking claim and the owner's to stand behind: under the Dutch
              and EU rules on misleading commercial practices the burden of
              proof sits with us if it is ever challenged. It is carried over
              from the live page deliberately - don't soften it without asking. */}
          <p
            className="mt-6 max-w-[38rem] text-pretty text-white/90"
            style={{ fontSize: TYPE.lead, lineHeight: 1.65 }}
          >
            <strong className="font-semibold text-white">
              De #1 bijbelstudietool van Nederland
            </strong>
            : vier vertalingen, bijbelcommentaar per vers, de Hebreeuwse en
            Griekse grondtekst en uw eigen notities - naast elkaar in één scherm.
          </p>

          <div className="mt-9 flex flex-col items-start gap-x-7 gap-y-4 sm:flex-row sm:items-center">
            <Link href="/inloggen" data-track="proefland_hero_signup" className={`w-full sm:w-auto ${CTA_PRIMARY}`}>
              Start gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="#in-actie" className={CTA_QUIET}>
              Bekijk hoe een les werkt
            </Link>
          </div>

          <p className="mt-7 text-sm text-white/85">
            Geen creditcard vereist · Gratis te gebruiken · Altijd opzegbaar
          </p>
        </div>
      </section>

      {/* -- Layer two, the horizon. Breaks the fold on purpose, and trails the
             sky layer at a third of its distance. -------------------------- */}
      <div className={`pl-horizon relative z-10 -mt-28 ${EDGE_X}`}>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {HERO_STATS.map(stat => (
            <GlassStat
              key={stat.label}
              label={stat.label}
              value={
                stat.count ? (
                  // The server renders the final number; the climb is a client
                  // flourish laid on top of HTML that is already complete.
                  <CountUp value={stat.value} />
                ) : (
                  stat.value
                )
              }
            />
          ))}
        </dl>
      </div>
    </>
  )
}
