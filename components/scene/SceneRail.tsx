"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BookMarked, BookOpen, LayoutDashboard, MessageSquareText,
  Settings, ShieldCheck, StickyNote, User,
} from "lucide-react"
import { useStudyStyle } from "../providers/study-style-provider"
import { RAIL_OPEN, RAIL_REST, RAIL_WIDE, TEAL_ON_DARK } from "./tokens"

/**
 * The sidebar, solved for a full-bleed scene.
 *
 * The permanent 16rem white column is the one piece of chrome that cuts the
 * landscape in half, so it is gone. What replaces it is the shape /studie
 * already uses for the same reason (`StudyRail` in components/layout/
 * app-sidebar.tsx): a narrow rail that stands IN the landscape instead of
 * taking a white column out of it, and widens to its labels on hover or
 * keyboard focus without moving a single pixel of content.
 *
 * Two things are different here, because here it sits on a picture rather than
 * on a white page:
 *
 *  - Closed, it is glass. The rail is a film of white over a blur, so the sky
 *    and the land keep running underneath it; the legibility comes from the
 *    page's own left scrim behind it, not from painting the rail solid.
 *  - It tightens as the reader scrolls. `--veil`, the same variable that darkens
 *    the scene behind the working panels, fades in the rail's dark base - at the
 *    top of the page the rail is barely there, over the panels it is a defined
 *    edge. Opacity only, so it costs nothing.
 *
 * What changed after two rounds of use, and why:
 *
 *  - Open, it is opaque (RAIL_OPEN). It used to widen to 176px as a film of
 *    white over a blur, laid across every heading with the copy still ghosting
 *    through - which does not read as depth, it reads as a broken render.
 *  - It opens INTO its own gutter and never past it. The answer to the ghosting
 *    was briefly to reserve the open width in `SCENE_X`, which pushed every
 *    page's content a fifth of the way across the screen. It costs the page
 *    nothing again: RAIL_REST is 64px, RAIL_WIDE is 96px at `lg` and 112px at
 *    `xl`, and the gutter is exactly those last two numbers. The rail can be
 *    over the scrim or over its own gutter and nowhere else, so it cannot cover
 *    a glyph at any width, open or shut.
 *  - What buys that: the label sits UNDER the icon rather than beside it. A
 *    label beside an 18px glyph needs about 150px; under it, 96px is generous.
 *    Nothing else about the interaction moved - hover and `focus-within` both
 *    open it, every item is still a link in tab order, and the full label is
 *    still on `title` for a pointer that never opens it.
 *  - The right-hand hairline is permanent instead of veil-driven. At the top of
 *    a page the rail had no edge at all, which is half of why it read as a smear
 *    over the page rather than as a rail beside it.
 *
 * Below `lg` there is no room for a rail and no hover to open one, so the same
 * items become a horizontally scrollable strip of pills that sticks under the
 * navbar. One list of links, two shapes.
 *
 * The items and the links are the real ones, read off app-sidebar.tsx, in the
 * order that file's `useStudyStyle` puts them in.
 */

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
 * Which item the reader is standing on. */
function useIsActive() {
  const pathname = usePathname() ?? ""
  return (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard"
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
 * One row of the rail: the icon always, the label under it once the rail is
 * open.
 *
 * The row is centred rather than left-inset, so the icons ride the rail's own
 * centre line and stay centred as it widens. The label is a collapsed line that
 * grows to its 14px and fades in together, which keeps the whole open state one
 * gesture; `truncate` plus the `title` above means a long word can never push
 * the row wider than the gutter, which is the one thing this rail may not do.
 */
function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li className="list-none">
      <Link
        href={item.url}
        title={item.title}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-10 w-full flex-col items-center justify-center rounded-lg px-1 py-2 no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 ${
          active ? "bg-white/15 font-semibold text-white" : "font-normal text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: TEAL_ON_DARK }} />
        )}
        <Icon size={18} className="flex-shrink-0" style={active ? { color: TEAL_ON_DARK } : undefined} />
        <span className="block max-h-0 w-full truncate text-center text-[10.5px] leading-[1.3] opacity-0 transition-[max-height,opacity,margin] duration-200 motion-reduce:transition-none group-hover/rail:mt-1 group-hover/rail:max-h-4 group-hover/rail:opacity-100 group-focus-within/rail:mt-1 group-focus-within/rail:max-h-4 group-focus-within/rail:opacity-100">
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
        className={`group/rail fixed bottom-0 left-0 top-14 z-40 hidden flex-col overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex ${RAIL_REST} ${RAIL_WIDE}`}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.07] backdrop-blur-md" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/40"
          style={{ opacity: "var(--veil, 0)" }}
        />
        {/* The opaque ground, faded in only while the rail is open. Painted over
            the glass and the veil and under the list, so an open rail is a
            surface rather than a filter over whatever is behind it. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 motion-reduce:transition-none group-hover/rail:opacity-100 group-focus-within/rail:opacity-100 ${RAIL_OPEN}`}
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/20" />

        {/* `overflow-y-auto`: the rows grow by a line each when the labels
            arrive, and on a short laptop the eight of them can outrun the
            viewport. Scrolling is the only answer that keeps every item
            reachable - squashing them would put the bottom three out of reach
            of both the pointer and the tab key. */}
        <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-1.5 py-2">
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
