"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BookMarked, BookOpen, LayoutDashboard, MessageSquareText,
  Settings, ShieldCheck, StickyNote, User,
} from "lucide-react"
import { useStudyStyle } from "../../../providers/study-style-provider"

/**
 * The sidebar, solved for a full-bleed scene.
 *
 * The permanent 16rem white column is the one piece of chrome that cuts the
 * landscape in half, so it is gone. What replaces it is the shape /studie
 * already uses for the same reason (`StudyRail` in components/layout/
 * app-sidebar.tsx): a narrow rail that FLOATS over the page instead of taking a
 * column out of it, and widens to its labels on hover or keyboard focus without
 * moving a single pixel of content.
 *
 * Two things are different here, because here it sits on a picture rather than
 * on a white page:
 *
 *  - It is glass. The rail is a film of white over a blur, so the sky and the
 *    land keep running underneath it; the legibility comes from the page's own
 *    left scrim behind it, not from painting the rail solid.
 *  - It tightens as the reader scrolls. `--veil`, the same variable that darkens
 *    the scene behind the working panels, fades in the rail's dark base and its
 *    right-hand hairline - at the top of the page the rail is barely there, over
 *    the panels it is a defined edge. Opacity only, so it costs nothing.
 *
 * Below `lg` there is no room for a rail and no hover to open one, so the same
 * items become a horizontally scrollable strip of pills that sticks under the
 * navbar. One list of links, two shapes.
 *
 * The items and the links are the real ones, read off app-sidebar.tsx, in the
 * order that file's `useStudyStyle` puts them in.
 */

const TEAL_ON_DARK = "#2DD4BF"

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
}

const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studies",   url: "/studies",   icon: BookMarked },
  { title: "Lezen",     url: "/lezen",     icon: BookOpen },
  { title: "Notities",  url: "/notities",  icon: StickyNote },
]

/** "Zelf lezen" swaps Lezen and Studies, exactly as the real sidebar does. */
const MAIN_NAV_SELF: NavItem[] = [MAIN_NAV[0], MAIN_NAV[2], MAIN_NAV[1], MAIN_NAV[3]]

const BOTTOM_NAV: NavItem[] = [
  { title: "Profiel",      url: "/profiel",      icon: User },
  { title: "Instellingen", url: "/instellingen", icon: Settings },
  { title: "Feedback",     url: "/feedback",     icon: MessageSquareText },
]

/**
 * This candidate lives at /proefdashboard/versie-3, so nothing in the menu is
 * literally the current path - but the page the reader is looking at IS the
 * dashboard, and the menu should say so rather than marking nothing.
 */
function useIsActive() {
  const pathname = usePathname() ?? ""
  return (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/proefdashboard")
    return pathname === url || pathname.startsWith(url + "/")
  }
}

function useNav(): NavItem[] {
  const { studyStyle } = useStudyStyle()
  const { data: session } = useSession()
  const main = studyStyle === "self" ? MAIN_NAV_SELF : MAIN_NAV
  return session?.user?.isAdmin
    ? [...main, { title: "Beheer", url: "/admin", icon: ShieldCheck }]
    : main
}

/* ── The rail, lg and up ─────────────────────────────────────── */

/**
 * One row of the rail: the icon always, the label only once the rail is open.
 *
 * `pl-[15px]` is not arbitrary - 8px of list padding plus 15 plus half of an
 * 18px glyph puts the icon exactly on the centre line of the rail at its
 * resting width of 64px, so nothing shifts sideways as the labels arrive.
 */
function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="list-none">
      <Link
        href={item.url}
        title={item.title}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-10 items-center gap-3.5 rounded-lg pl-[15px] no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/15 font-semibold text-white" : "font-normal text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: TEAL_ON_DARK }} />
        )}
        <Icon size={18} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        <span className="-translate-x-1 whitespace-nowrap text-[13.5px] opacity-0 transition-[opacity,transform] duration-200 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
          {item.title}
        </span>
      </Link>
    </li>
  )
}

/* ── The strip, below lg ─────────────────────────────────────── */

function PillItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="list-none">
      <Link
        href={item.url}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/20 font-semibold text-white" : "font-normal text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={15} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        {item.title}
      </Link>
    </li>
  )
}

export default function SceneRail() {
  const nav = useNav()
  const isActive = useIsActive()

  return (
    <>
      <nav
        aria-label="Hoofdnavigatie"
        className="group/rail fixed bottom-0 left-0 top-14 z-40 hidden w-16 flex-col overflow-hidden transition-[width] duration-300 ease-out hover:w-56 focus-within:w-56 lg:flex"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.07] backdrop-blur-md" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/40"
          style={{ opacity: "var(--veil, 0)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/25"
          style={{ opacity: "var(--veil, 0)" }}
        />

        <div className="relative flex h-full min-h-0 flex-col p-2">
          <ul className="m-0 flex flex-col gap-0.5 p-0">
            {nav.map(item => (
              <RailItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>

          <div className="flex-1" />

          <ul className="m-0 flex flex-col gap-0.5 border-t border-white/15 p-0 pt-2">
            {BOTTOM_NAV.map(item => (
              <RailItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>
        </div>
      </nav>

      <nav
        aria-label="Hoofdnavigatie"
        className="sticky top-14 z-40 lg:hidden"
      >
        <div className="relative overflow-x-auto bg-black/80 backdrop-blur-md">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/20" />
          <ul className="m-0 flex items-center gap-1 px-3 py-2">
            {[...nav, ...BOTTOM_NAV].map(item => (
              <PillItem key={item.url} item={item} active={isActive(item.url)} />
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
