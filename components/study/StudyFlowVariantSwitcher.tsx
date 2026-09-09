"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Hop between the four study-flow designs under review, and between the three
 * screens of whichever one you are looking at.
 *
 * The flow is being judged as a whole rather than screen by screen, so this
 * keeps your place: switching design from a lesson lands you on that design's
 * lesson, not back at its overview. Text links only, so it never competes with
 * the page it sits on. Remove together with the /studies/versie-* and
 * /studie/versie-* routes once a direction is chosen.
 */

export const FLOW_VARIANTS = [
  { n: "a", name: "A" },
  { n: "b", name: "B" },
  { n: "c", name: "C" },
] as const

/** The study the detail and lesson screens demo when the URL names none. */
export const DEMO_STUDY = "opstanding"
export const DEMO_DAY = 1

type Screen = "overzicht" | "detail" | "les"

/** Which of the three screens a path is, and what it is pointing at. */
function parse(pathname: string): { variant: string; screen: Screen; study: string; day: number } | null {
  const lesson = /^\/studie\/versie-([a-z])\/([^/]+)\/(\d+)/.exec(pathname)
  if (lesson) {
    return { variant: lesson[1], screen: "les", study: decodeURIComponent(lesson[2]), day: Number(lesson[3]) }
  }
  const detail = /^\/studies\/versie-([a-z])\/([^/]+)/.exec(pathname)
  if (detail) {
    return { variant: detail[1], screen: "detail", study: decodeURIComponent(detail[2]), day: DEMO_DAY }
  }
  const overview = /^\/studies\/versie-([a-z])$/.exec(pathname)
  if (overview) {
    return { variant: overview[1], screen: "overzicht", study: DEMO_STUDY, day: DEMO_DAY }
  }
  return null
}

export function flowHref(variant: string, screen: Screen, study = DEMO_STUDY, day = DEMO_DAY): string {
  if (screen === "les") return `/studie/versie-${variant}/${encodeURIComponent(study)}/${day}`
  if (screen === "detail") return `/studies/versie-${variant}/${encodeURIComponent(study)}`
  return `/studies/versie-${variant}`
}

const SCREENS: { key: Screen; label: string }[] = [
  { key: "overzicht", label: "Overzicht" },
  { key: "detail", label: "Studie" },
  { key: "les", label: "Les" },
]

export default function StudyFlowVariantSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const here = parse(pathname ?? "")
  if (!here) return null

  const link = "no-underline transition-colors"
  const on = "font-bold text-[#0D9488] dark:text-teal-400"
  const off = "text-muted-foreground hover:text-foreground"

  return (
    <nav
      aria-label="Studieflow-ontwerpen"
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-none ${className}`}
    >
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-muted-foreground">Ontwerp</span>
        {FLOW_VARIANTS.map(variant => (
          <Link
            key={variant.n}
            href={flowHref(variant.n, here.screen, here.study, here.day)}
            title={variant.name}
            aria-current={variant.n === here.variant ? "page" : undefined}
            className={`${link} ${variant.n === here.variant ? on : off}`}
          >
            {variant.n}
            <span className="sr-only"> — {variant.name}</span>
          </Link>
        ))}
      </span>

      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-muted-foreground">Scherm</span>
        {SCREENS.map(screen => (
          <Link
            key={screen.key}
            href={flowHref(here.variant, screen.key, here.study, here.day)}
            aria-current={screen.key === here.screen ? "page" : undefined}
            className={`${link} ${screen.key === here.screen ? on : off}`}
          >
            {screen.label}
          </Link>
        ))}
      </span>

      <Link href="/studies" className={`${link} ${off}`}>
        Huidig
      </Link>
    </nav>
  )
}
